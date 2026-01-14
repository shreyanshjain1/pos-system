"use client"
import React, { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const [manual, setManual] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function handleAdd() {
    const code = String(manual || '').trim()
    if (!code) {
      setMessage('Enter a barcode')
      return
    }
    try {
      onDetected(code)
      setMessage('Added: ' + code)
      setManual('')
    } catch (e) {
      setMessage('Failed to add')
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div>
        <div className="text-sm text-gray-700">Using hardware scanners (keyboard input) only. Or paste type a barcode below.</div>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Type or paste barcode, press Enter" value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} className="flex-1" />
        <Button onClick={handleAdd}>Add</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {message && <div className="text-sm text-gray-600">{message}</div>}
    </div>
  )
}
