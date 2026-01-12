"use client"
import React, { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type Settings = {
  storeName: string
  currency: string
  receiptHeader: string
  receiptFooter: string
  autoClosePrint?: boolean
  paperSize?: string
  preferredPrinter?: string
  scannerDeviceId?: string
  scannerMode?: 'keyboard'
  // BIR optional settings
  birEnabled?: boolean
  birTin?: string
  birBusinessAddress?: string
  birPermit?: string
  birPricesIncludeVat?: boolean
  birVatRate?: number
}

const STORAGE_KEY = 'pos:settings'

const DEFAULTS: Settings = {
  storeName: '',
  currency: 'PHP',
  receiptHeader: '',
  receiptFooter: '',
  autoClosePrint: true,
  paperSize: '80',
  preferredPrinter: '',
  scannerDeviceId: '',
  scannerMode: 'keyboard',
  birEnabled: false,
  birTin: '',
  birBusinessAddress: '',
  birPermit: '',
  birPricesIncludeVat: true,
  birVatRate: 12,
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    let mounted = true
    async function load() {
      // try server first
      try {
        const res = await fetchWithAuth('/api/settings')
        if (res.ok) {
          const json = await res.json()
          if (mounted && json?.data) setSettings(prev => ({ ...prev, ...json.data }))
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...(json?.data || {}) })) } catch (_) {}
          return
        }
      } catch (_) {}

      // fallback to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw && mounted) setSettings(JSON.parse(raw))
      } catch (err) {
        // ignore parse errors
      }
    }

    load()
    // hardware scanner only — no camera enumeration
    return () => { mounted = false }
  }, [])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    const payload = settings
    // optimistically save to localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch (_) {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // try server save; ignore failures (keep localStorage)
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          console.warn('Settings save failed', json?.error)
        }
      } catch (err) {
        console.warn('Settings save network error', err)
      }
    })()
  }

  function handleReset() {
    setSettings(DEFAULTS)
    localStorage.removeItem(STORAGE_KEY)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Store name</div>
        <input
          value={settings.storeName}
          onChange={e => update('storeName', e.target.value)}
          placeholder="e.g. Drayley's Store"
          style={{ width: '100%', padding: '8px 10px' }}
        />
      </label>

      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Currency</div>
        <select
          value={settings.currency}
          onChange={e => update('currency', e.target.value)}
          style={{ width: 200, padding: '8px 10px' }}
        >
          <option value="PHP">PHP — Philippine Peso</option>
          <option value="USD">USD — US Dollar</option>
          <option value="EUR">EUR — Euro</option>
        </select>
      </label>

      <label>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Receipt header</div>
        <textarea
          value={settings.receiptHeader}
          onChange={e => update('receiptHeader', e.target.value)}
          placeholder="Optional header printed on receipts"
          style={{ width: '100%', minHeight: 64, padding: 8 }}
        />
      </label>

      <label>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Receipt footer</div>
        <textarea
          value={settings.receiptFooter}
          onChange={e => update('receiptFooter', e.target.value)}
          placeholder="Optional footer printed on receipts"
          style={{ width: '100%', minHeight: 64, padding: 8 }}
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={!!settings.autoClosePrint}
          onChange={e => update('autoClosePrint', e.target.checked)}
        />
        <div style={{ fontSize: 12, color: '#333' }}>Auto-close print window after printing</div>
      </label>

      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Printer paper size</div>
        <select
          value={settings.paperSize}
          onChange={e => update('paperSize', e.target.value)}
          style={{ width: 160, padding: '8px 10px' }}
        >
          <option value="80">80mm (standard)</option>
          <option value="58">58mm (narrow)</option>
        </select>
      </label>

      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Preferred printer (optional)</div>
        <input
          value={settings.preferredPrinter || ''}
          onChange={e => update('preferredPrinter', e.target.value)}
          placeholder="Printer name (for reference)"
          style={{ width: '100%', padding: '8px 10px' }}
        />
        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Note: the browser print dialog controls the actual printer selection. This field is saved for convenience.</div>
      </label>

      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Barcode scanner</div>
        <div style={{ fontSize: 13, color: '#444' }}>This app uses hardware barcode scanners (USB keyboard-emulating). When scanning, the scanner will type the barcode into the focused input. Camera-based scanning is disabled.</div>
      </label>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!settings.birEnabled} onChange={e => update('birEnabled', e.target.checked)} />
          <div style={{ fontSize: 13, fontWeight: 700 }}>Enable BIR / Official Receipt format (optional)</div>
        </label>

        {settings.birEnabled && (
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <label>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Business TIN</div>
              <input value={settings.birTin || ''} onChange={e => update('birTin', e.target.value)} placeholder="123-456-789-000" style={{ width: '100%', padding: '8px 10px' }} />
            </label>

            <label>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Business Address</div>
              <input value={settings.birBusinessAddress || ''} onChange={e => update('birBusinessAddress', e.target.value)} placeholder="Street, City, Postal" style={{ width: '100%', padding: '8px 10px' }} />
            </label>

            <label>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Permit / Accreditation (optional)</div>
              <input value={settings.birPermit || ''} onChange={e => update('birPermit', e.target.value)} placeholder="Permit no / Accreditation" style={{ width: '100%', padding: '8px 10px' }} />
            </label>

            <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!settings.birPricesIncludeVat} onChange={e => update('birPricesIncludeVat', e.target.checked)} />
                <div style={{ fontSize: 13 }}>Prices include VAT</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>VAT rate (%)</div>
                <input type="number" value={settings.birVatRate as number || 12} onChange={e => update('birVatRate', Number(e.target.value || 12))} style={{ width: 100, padding: '8px 10px' }} />
              </div>
            </label>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="submit" style={{ padding: '8px 12px' }}>
          Save
        </button>
        <button type="button" onClick={handleReset} style={{ padding: '8px 12px' }}>
          Reset
        </button>
        {saved && <div style={{ color: 'green', alignSelf: 'center' }}>Saved</div>}
      </div>
    </form>
  )
}
