/**
 * Simple in-memory rate limiter for API endpoints
 * Tracks requests by IP/identifier and enforces limits
 */

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number }
}

const store: RateLimitStore = {}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = store[identifier]

  if (!record || now > record.resetAt) {
    // Create new record
    store[identifier] = {
      count: 1,
      resetAt: now + windowMs,
    }
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Get rate limit status for identifier
 */
export function getRateLimitStatus(identifier: string) {
  return store[identifier] || null
}

/**
 * Clear rate limit for identifier (for testing)
 */
export function clearRateLimit(identifier: string) {
  delete store[identifier]
}

/**
 * Clear all rate limits (for testing/restart)
 */
export function clearAllRateLimits() {
  for (const key in store) {
    delete store[key]
  }
}

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (now > store[key].resetAt) {
      delete store[key]
    }
  }
}, 5 * 60 * 1000)
