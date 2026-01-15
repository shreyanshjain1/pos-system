/** @jest-environment jsdom */
import deviceService from '@/lib/deviceId'

describe('deviceId service', () => {
  beforeEach(() => {
    localStorage.clear()
    // clear caches if present
    // @ts-ignore
    if (global.caches && global.caches.keys) {
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
