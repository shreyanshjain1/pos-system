"use client"
import React, { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import formatCurrency from '@/lib/format/currency'
import supabase from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type Product = { id: string; name: string; price: number; stock: number; barcode?: string }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')

  // form for create
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [barcode, setBarcode] = useState('')
  const [showScannerCreate, setShowScannerCreate] = useState(false)
  const [scannerDeviceId, setScannerDeviceId] = useState<string | null>(null)
  const [scannerMode, setScannerMode] = useState<'keyboard'>('keyboard')

  // edit state
  const [editing, setEditing] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editBarcode, setEditBarcode] = useState('')
  const [showScannerEdit, setShowScannerEdit] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    // initial load
    fetchList()

    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // subscribe to product changes and refresh list
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchList()
      })
      .subscribe()

    // load scanner settings
    try {
      const raw = localStorage.getItem('pos:settings')
      if (raw) {
        const cfg = JSON.parse(raw || '{}')
        if (cfg.scannerDeviceId) setScannerDeviceId(cfg.scannerDeviceId)
        if (cfg.scannerMode) setScannerMode(cfg.scannerMode)
      }
    } catch (_) {}

    const onSettingsUpdate = () => {
      try {
        const raw = localStorage.getItem('pos:settings')
        if (raw) {
          const cfg = JSON.parse(raw || '{}')
          if (cfg.scannerDeviceId) setScannerDeviceId(cfg.scannerDeviceId)
          if (cfg.scannerMode) setScannerMode(cfg.scannerMode)
        }
      } catch (_) {}
    }
    window.addEventListener('pos:settings:updated', onSettingsUpdate)

    return () => {
      try { channel.unsubscribe() } catch (_) {}
      try { window.removeEventListener('pos:settings:updated', onSettingsUpdate) } catch (_) {}
      try { window.removeEventListener('resize', checkMobile) } catch (_) {}
    }
  }, [])

  useEffect(() => {
    if (!showScannerCreate && !showScannerEdit) return
    if (scannerMode === 'keyboard') {
      setTimeout(() => {
        const el = document.querySelector('input[placeholder="Type or paste barcode, press Enter"]') as HTMLInputElement | null
        if (el) el.focus()
      }, 200)
    }
  }, [showScannerCreate, showScannerEdit, scannerMode])

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
      if (isMobile) setShowCreateModal(false)
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
    if (isMobile) setShowEditModal(true)
  }

  function cancelEdit() {
    setEditing(null)
    setEditName('')
    setEditPrice('')
    setEditStock('')
    if (isMobile) setShowEditModal(false)
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
      if (isMobile) setShowEditModal(false)
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
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center mb-6">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold">Products</h2>
            <p className="text-sm text-slate-500">Create and manage products</p>
          </div>
          <div className="w-full max-w-md">
            <input
              type="search"
              placeholder="Search products by name or barcode"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') {
                const q = String(search || '').trim().toLowerCase()
                if (!q) return
                const exact = products.find(p => (p.barcode && p.barcode.toLowerCase() === q) || p.name.toLowerCase() === q)
                if (exact) startEdit(exact)
              } }}
              className="border border-gray-200 rounded-full px-4 h-10 w-full bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            {loading ? (
              <div className="h-48 animate-pulse bg-white rounded-md" />
            ) : error ? (
              <div className="text-red-600">{error}</div>
              ) : (
              <div>
                {search ? (
                  <div className="mb-3">
                    {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').toLowerCase().includes(search.toLowerCase())).slice(0, 12).map(p => (
                      <div key={p.id} className="py-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.barcode ?? '—'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" className="rounded-full" onClick={() => startEdit(p)}>Edit</Button>
                          <Button className="rounded-full" onClick={() => handleDelete(p.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm divide-y divide-gray-100">
                    <thead>
                      <tr className="bg-white">
                        <th className="py-3 px-4 text-left text-slate-600">Name</th>
                        <th className="py-3 px-4 text-left text-slate-600">Barcode</th>
                        <th className="py-3 px-4 text-right text-slate-600">Price</th>
                        <th className="py-3 px-4 text-right text-slate-600">Stock</th>
                        <th className="py-3 px-4 text-right text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} className="border-t border-gray-100 hover:bg-slate-50">
                          <td className="py-4 px-4">{p.name}</td>
                          <td className="py-4 px-4">{p.barcode ?? '—'}</td>
                          <td className="py-4 px-4 text-right">{formatCurrency(p.price)}</td>
                          <td className="py-4 px-4 text-right">{p.stock}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button variant="secondary" className="rounded-full" onClick={() => startEdit(p)}>Edit</Button>
                              <Button className="rounded-full" onClick={() => handleDelete(p.id)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="max-w-md w-full lg:col-span-1">
          <Card className="p-6">
            {editing ? (
              <>
                <h3 className="text-lg font-semibold mb-3">Edit product</h3>
                <form onSubmit={handleUpdate} className="space-y-3">
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Name</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Barcode</label>
                      <div className="flex gap-2">
                        <input value={editBarcode} onChange={e => setEditBarcode(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                        <button type="button" title="Scan barcode" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center" onClick={() => setShowScannerEdit(true)} aria-label="Open barcode scanner">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7h2v10H3V7zM7 7h2v10H7V7zM11 7h6v2h-6V7zM11 11h6v2h-6v-2zM11 15h6v2h-6v-2zM21 7h-2v10h2V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Price</label>
                      <input value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Stock</label>
                      <input value={editStock} onChange={e => setEditStock(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                    </div>
                  <div className="flex gap-2">
                    <Button>Save</Button>
                    <button type="button" className="px-3 py-2 rounded-md bg-gray-100" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                  <h3 className="text-lg font-semibold mb-3">Create product</h3>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Barcode</label>
                    <div className="flex gap-2">
                      <input value={barcode} onChange={e => setBarcode(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                      <button type="button" title="Scan barcode" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center" onClick={() => setShowScannerCreate(true)} aria-label="Open barcode scanner">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7h2v10H3V7zM7 7h2v10H7V7zM11 7h6v2h-6V7zM11 11h6v2h-6v-2zM11 15h6v2h-6v-2zM21 7h-2v10h2V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Price</label>
                    <input value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Stock</label>
                    <input value={stock} onChange={e => setStock(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                  </div>
                  {error && <div className="text-red-600">{error}</div>}
                  <div>
                    <Button className="rounded-full px-5">Create</Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Floating action buttons for mobile */}
      {isMobile && (
        <>
          {/* Create button */}
          <button
            aria-label="Create product"
            className="floating-action-btn"
            onClick={() => setShowCreateModal(true)}
            style={{ bottom: editing ? '90px' : '22px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: '#fff' }}>
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Edit button (only show when editing) */}
          {editing && (
            <button
              aria-label="Edit product"
              className="floating-action-btn"
              onClick={() => setShowEditModal(true)}
              style={{ bottom: '22px', background: '#f59e0b' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: '#fff' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Create modal */}
          {showCreateModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ width: '100%', maxWidth: 520, padding: 12 }}>
                <Card>
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
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <Button>Create</Button>
                      <button type="button" className="btn secondary" onClick={() => { setShowCreateModal(false); setName(''); setPrice(''); setStock(''); setBarcode(''); setError(null); }}>Cancel</button>
                    </div>
                  </form>
                </Card>
              </div>
            </div>
          )}

          {/* Edit modal */}
          {editing && showEditModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ width: '100%', maxWidth: 520, padding: 12 }}>
                <Card>
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
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Scanner modals */}
      {showScannerCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ width: 420 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Scan Barcode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 320 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: '#444', fontSize: 13 }}>Using hardware scanner (keyboard input). Focus the barcode input below and scan — each scan will be typed into the field.</div>
                  </div>
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
                <div style={{ height: 320 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: '#444', fontSize: 13 }}>Using hardware scanner (keyboard input). Focus the barcode input below and scan — each scan will be typed into the field.</div>
                  </div>
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
