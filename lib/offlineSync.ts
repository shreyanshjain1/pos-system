// Offline sync disabled. Provide a safe no-op export for startAutoSync.

export function startAutoSync() {
  return () => {}
}

export async function flushOnce() {
  return Promise.resolve()
}

export default { startAutoSync, flushOnce }
