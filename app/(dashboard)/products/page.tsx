"use client"
import React, { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import formatCurrency from '@/lib/format/currency'
import supabase from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
// Camera-based scanning removed; hardware scanner only

type Product = { id: string; name: string; price: number; stock: number; barcode?: string }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // form for create
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [barcode, setBarcode] = useState('')
  const [showScannerCreate, setShowScannerCreate] = useState(false)

  // edit state
  const [editing, setEditing] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editBarcode, setEditBarcode] = useState('')
  const [showScannerEdit, setShowScannerEdit] = useState(false)

  useEffect(() => {
    // initial load
    fetchList()

    // subscribe to product changes and refresh list
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchList()
      })
      .subscribe()

    return () => {
      try { channel.unsubscribe() } catch (_) {}
    }
  }, [])

  async function fetchList() {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/products')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load products')
      setProducts(json.data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // barcode management will be handled on the Barcodes page

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name) return setError('Name is required')
    const payload: any = { name, price: Number(price || 0), stock: Number(stock || 0), barcode: barcode || null }
    try {
      const res = await fetchWithAuth('/api/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Create failed')
      setName(''); setPrice(''); setStock('')
      setBarcode('')
      fetchList()
    } catch (err: any) {
      setError(err?.message || 'Create failed')
    }
  }

  function startEdit(p: Product) {
    setEditing(p)
    setEditName(p.name)
    setEditPrice(String(p.price))
    setEditStock(String(p.stock))
    setEditBarcode(p.barcode || '')
  }

  function cancelEdit() {
    setEditing(null)
    setEditName('')
    setEditPrice('')
    setEditStock('')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    try {
      const payload: any = { name: editName, price: Number(editPrice || 0), stock: Number(editStock || 0), barcode: editBarcode || null }
      const res = await fetchWithAuth(`/api/products/${editing.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Update failed')
      cancelEdit()
      fetchList()
    } catch (err: any) {
      setError(err?.message || 'Update failed')
    }
  }

  async function submitInlineUpdate(id: string) {
    return
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setError(null)
    try {
      const res = await fetchWithAuth(`/api/products/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      // remove from UI optimistically instead of refetching list
      setProducts(prev => prev.filter(p => p.id !== id))
      if (editing?.id === id) cancelEdit()
    } catch (err: any) {
      setError(err?.message || 'Delete failed')
    }
  }

  // category-related UI removed; categories managed separately

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Products</h2>
          <p className="muted">Create and manage products</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div>
          <Card>
            {loading ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : error ? (
              <div style={{ color: 'red' }}>{error}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Barcode</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Stock</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ padding: '8px 6px' }}>{p.name}</td>
                      <td style={{ padding: '8px 6px' }}>{p.barcode ?? '—'}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{formatCurrency(p.price)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{p.stock}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <button className="btn secondary" style={{ marginRight: 8 }} onClick={() => startEdit(p)}>Edit</button>
                        <button className="btn" onClick={() => handleDelete(p.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            {editing ? (
              <>
                <h3 style={{ marginTop: 0 }}>Edit product</h3>
                <form onSubmit={handleUpdate}>
                  <div className="form-field">
                    <label>Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                    <div className="form-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label>Barcode</label>
                        <input value={editBarcode} onChange={e => setEditBarcode(e.target.value)} style={{ height: 40, padding: '8px 12px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 20 }}>
                        <button type="button" title="Scan barcode" className="btn secondary" onClick={() => setShowScannerEdit(true)} style={{ width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} aria-label="Open barcode scanner">
                          <svg style={{ display: 'block' }} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h2v10H3V7zM7 7h2v10H7V7zM11 7h6v2h-6V7zM11 11h6v2h-6v-2zM11 15h6v2h-6v-2zM21 7h-2v10h2V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </div>
                  <div className="form-field">
                    <label>Price</label>
                    <input value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Stock</label>
                    <input value={editStock} onChange={e => setEditStock(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button>Save</Button>
                    <button type="button" className="btn secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Create product</h3>
                <form onSubmit={handleCreate}>
                  <div className="form-field">
                    <label>Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="form-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label>Barcode</label>
                      <input value={barcode} onChange={e => setBarcode(e.target.value)} style={{ height: 40, padding: '8px 12px' }} />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 20 }}>
                      <button type="button" title="Scan barcode" className="btn secondary" onClick={() => setShowScannerCreate(true)} style={{ width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} aria-label="Open barcode scanner">
                        <svg style={{ display: 'block' }} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h2v10H3V7zM7 7h2v10H7V7zM11 7h6v2h-6V7zM11 11h6v2h-6v-2zM11 15h6v2h-6v-2zM21 7h-2v10h2V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Price</label>
                    <input value={price} onChange={e => setPrice(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Stock</label>
                    <input value={stock} onChange={e => setStock(e.target.value)} />
                  </div>
                  {error && <div className="muted" style={{ color: 'red' }}>{error}</div>}
                  <div style={{ marginTop: 8 }}>
                    <Button>Create</Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
      {/* Scanner modals */}
      {showScannerCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ width: 420 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Scan Barcode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#444', fontSize: 13 }}>Using hardware scanner (keyboard input). Focus the barcode input below and scan — each scan will be typed into the field.</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type or paste barcode, press Enter"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setShowScannerCreate(false) } }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}
                    autoFocus
                  />
                  <Button onClick={() => setShowScannerCreate(false)}>Add</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showScannerEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ width: 420 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Scan Barcode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#444', fontSize: 13 }}>Using hardware scanner (keyboard input). Focus the barcode input below and scan — each scan will be typed into the field.</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type or paste barcode, press Enter"
                    value={editBarcode}
                    onChange={e => setEditBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setShowScannerEdit(false) } }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}
                    autoFocus
                  />
                  <Button onClick={() => setShowScannerEdit(false)}>Add</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// Scanner modals placed outside main component's JSX return for clarity (rendered by state)
