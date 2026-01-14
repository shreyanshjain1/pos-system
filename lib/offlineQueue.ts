// Offline queue has been disabled temporarily.
// Keep no-op exports so any imports do not break the build.

export type QueuedSale = any

export async function addQueuedSale(_s: QueuedSale) {
  // no-op
  return Promise.resolve()
}

export async function getAllQueuedSales(): Promise<QueuedSale[]> {
  return Promise.resolve([])
}

export async function deleteQueuedSale(_client_sale_id: string) {
  return Promise.resolve()
}

export async function updateQueuedSaleAttempts(_client_sale_id: string, _attempts: number) {
  return Promise.resolve()
}

export default {}
