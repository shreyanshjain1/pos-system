/** @jest-environment jsdom */
import deviceService from '@/lib/deviceId'

describe('deviceId service', () => {
  beforeEach(() => {
    localStorage.clear()
    // clear caches if present
    // prefer @ts-expect-error to silence intentional test-only type issues
    // @ts-expect-error - jsdom global may not include `caches`
    if ((global as any).caches && (global as any).caches.keys) {
      // no-op in jsdom
    }
  })

  test('creates and persists a device id', async () => {
    const id1 = await deviceService.getOrCreateDeviceId()
    expect(typeof id1).toBe('string')
    const id2 = await deviceService.getOrCreateDeviceId()
    expect(id2).toBe(id1)
  })
})
