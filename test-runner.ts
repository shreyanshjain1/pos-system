 
import { setup } from 'jest-dev-server'

import assert from 'node:assert'

// enable ts-node register when invoked via `node -r ts-node/register test-runner.ts`
process.env.TEST_SUPABASE_MOCK = '1'

async function run() {
  console.log('Starting test-runner (ts-node) smoke tests...')

  // Import route handlers dynamically
  const { POST: productsPOST } = await import('./app/api/products/route')
  const { POST: checkoutPOST } = await import('./app/api/checkout/route')
  const { POST: assignBarcodePOST } = await import('./app/api/barcodes/assign/route')

  // 1) products POST without auth -> expect 403
  const req1 = new Request('http://localhost/api/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Sample', price: 10 }) })
  const res1 = await productsPOST(req1 as any)
  assert(res1 && (res1.status === 403), 'products POST without auth should be 403')

  // 2) products POST with good auth -> should create
  const headers2 = new Headers({ 'content-type': 'application/json', authorization: 'Bearer good' })
  const req2 = new Request('http://localhost/api/products', { method: 'POST', headers: headers2, body: JSON.stringify({ name: 'Sample', price: 99, stock: 5 }) })
  const res2 = await productsPOST(req2 as any)
  assert(res2 && (res2.status === 201 || res2.status === 200), 'products POST with auth should succeed')
  const body2 = await res2.json()
  assert(body2.data && body2.data.name === 'Sample')

  // 3) checkout requires mapping -> without auth should 403
  const req3 = new Request('http://localhost/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [] }) })
  const res3 = await checkoutPOST(req3 as any)
  assert(res3 && res3.status === 403, 'checkout without auth should be 403')

  // 4) checkout with auth should create sale
  const headers4 = new Headers({ 'content-type': 'application/json', authorization: 'Bearer good' })
  const req4 = new Request('http://localhost/api/checkout', { method: 'POST', headers: headers4, body: JSON.stringify({ items: [{ product_id: 'p1', quantity: 1 }], total: 100 }) })
  const res4 = await checkoutPOST(req4 as any)
  assert(res4 && res4.status === 200, 'checkout with auth should succeed')

  // 5) barcode assign missing fields -> 400
  const req5 = new Request('http://localhost/api/barcodes/assign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
  const res5 = await assignBarcodePOST(req5 as any)
  assert(res5 && res5.status === 400, 'barcode assign with missing fields should be 400')

  // 6) barcode assign success
  const payload6 = { shop_id: 'shop-1', device_id: 'dev-1', code: '123', product_id: 'p1' }
  const req6 = new Request('http://localhost/api/barcodes/assign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload6) })
  const res6 = await assignBarcodePOST(req6 as any)
  assert(res6 && (res6.status === 201 || res6.status === 200), 'barcode assign should succeed')

  console.log('All smoke tests passed')
}

run().catch((err) => {
  console.error('Test-runner failed:', err)
  process.exitCode = 2
})
