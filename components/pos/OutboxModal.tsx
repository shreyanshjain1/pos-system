"use client"
import React, { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { getAllOutboxItems, deleteOutboxItem } from '@/lib/offlineQueue'
import { flushOnce } from '@/lib/offlineSync'

export default function OutboxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [flushing, setFlushing] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const all = await getAllOutboxItems()
      setItems(all || [])
    } catch (e) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    load()
  }, [open])

  async function handleDelete(id: string) {
    try {
      await deleteOutboxItem(id)
      await load()
    } catch (_) { await load() }
  }

  async function handleFlush() {
    setFlushing(true)
    try {
      await flushOnce()
      // slight delay to allow sync to complete and DB to update
      setTimeout(() => load(), 600)
    } catch (_) {
      await load()
    } finally {
      setFlushing(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Queued Outbox Items">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Queued actions pending sync</div>
          <div className="flex items-center gap-2">
            <Button onClick={handleFlush} disabled={flushing || loading}>{flushing ? 'Flushing…' : 'Flush now'}</Button>
            <Button onClick={onClose} className="bg-gray-100 text-gray-800">Close</Button>
          </div>
        </div>

        {loading ? (
          <div>Loading…</div>
        ) : !items || items.length === 0 ? (
          <div className="text-sm text-gray-500">No queued items</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-auto">
            {items.map(it => (
              <div key={it.queueId} className="p-3 border rounded-md bg-gray-50 flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{it.actionType}</div>
                  <div className="text-xs text-gray-500">{new Date(it.timestamp).toLocaleString()}</div>
                  {it.lastError ? <div className="text-xs text-red-600 mt-1">Error: {String(it.lastError)}</div> : null}
                  <div className="text-xs text-gray-600 mt-2"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(it.payload)}</pre></div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <Button onClick={() => handleDelete(it.queueId)} className="bg-red-50 text-red-700">Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
