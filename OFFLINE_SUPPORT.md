# Offline Support Architecture

## Overview
The POS system has built-in offline support that automatically queues checkout transactions when the connection is lost and syncs them when reconnected.

## Components

### 1. **lib/offlineQueue.ts** - Transaction Storage
- **Technology**: IndexedDB (browser database, persistent across page reloads)
- **Purpose**: Store queued transactions locally
- **Key Functions**:
  - `addOutboxItem()` - Queue a new transaction
  - `getAllOutboxItems()` - Retrieve all queued transactions
  - `updateOutboxStatus()` - Mark transaction as pending/synced/failed
  - `getPendingSales()` - Get pending sales for offline display
  - `cacheProduct()`, `cacheBarcode()` - Cache products for offline lookup

### 2. **lib/offlineSync.ts** - Auto-Sync Engine
- **Purpose**: Automatically retry queued transactions every 30 seconds when online
- **Key Features**:
  - `startAutoSync()` - Start background sync loop (started on POS page mount)
  - `flushOnce()` - Manually trigger sync attempt
  - Prevents concurrent syncs
  - Max 3 retries per transaction (then marked as failed)
  - Respects 401/403 errors (won't retry auth failures)

### 3. **hooks/useOfflineQueue.ts** - React Hook
- **Purpose**: Easy access to offline state in React components
- **Returns**:
  - `isOnline` - Current connection status
  - `pendingCount` - Number of queued transactions
  - `failedCount` - Number of failed transactions
  - `queueCheckout()` - Queue a checkout payload

### 4. **components/ui/OfflineIndicator.tsx** - UI Component
- **Purpose**: Shows visual indicators for offline status
- **Displays**:
  - 🔴 Offline badge when no connection
  - ⏳ Pending transaction count
  - ❌ Failed transaction count
- **Location**: Fixed bottom-right corner

## How It Works

### Offline Checkout Flow
```
User performs checkout while offline
    ↓
performCheckout() fails with network error
    ↓
Error is caught → queueCheckout() called
    ↓
Transaction stored in IndexedDB
    ↓
User sees "Transaction queued" message
    ↓
Cart is cleared (preventing accidental duplicates)
    ↓
When connection returns → auto sync kicks in (30s interval)
    ↓
Transaction sent to /api/checkout
    ↓
Success → transaction marked synced + deleted
         Failed → retry up to 3 times → marked failed if max retries exceeded
```

### Data Flow
```
POS Page
  ├─ useOfflineQueue() hook
  │  ├─ Tracks isOnline, pendingCount, failedCount
  │  └─ Calls queueCheckout() on offline
  │
  ├─ startAutoSync() on mount
  │  └─ Runs flushOnce() every 30s when online
  │
  └─ OnlineContext
     └─ Monitors navigator.onLine + pings /api/summary every 15s
```

## Transaction States
- **pending** - Queued, waiting to sync (or retrying)
- **synced** - Successfully sent to server
- **failed** - Max retries exceeded or auth error

## Storage Limits
- IndexedDB typically allows 50MB+ per origin (browser dependent)
- Each checkout transaction ~2KB
- Can store 25,000+ transactions before hitting limits

## Manual Sync
```javascript
// Force immediate sync from anywhere
import { flushOnce } from '@/lib/offlineSync'
await flushOnce()
```

## Testing Offline Mode
1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Perform checkout → see "Transaction queued" message
4. Go back online → watch sync happen in console
5. Check Sales page → transaction appears

## Error Handling
- **Network errors** → Automatically queued
- **Auth failures (401/403)** → Marked failed immediately (won't retry)
- **Max retries exceeded** → Marked failed (visible in UI)
- **Users can manually review** → Check failed transactions in Sales history

## Benefits
✅ No lost sales during brief connection drops  
✅ Seamless user experience - no page reload needed  
✅ Persistent queue survives page reloads  
✅ Automatic retry without user intervention  
✅ Clear visual feedback on queue status  

## Limitations
- Offline mode queues checkout only (not inventory sync)
- Product catalog is live (requires connection for lookups)
- No offline barcode scanning (requires server validation)
- Queue syncs in order (FIFO)
