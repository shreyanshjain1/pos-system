"use client"
import React from 'react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function BarcodesPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Barcodes</h2>
        <p className="text-sm text-slate-500">Category feature removed — barcode workflow is in use.</p>
      </div>

      <Card className="p-6">
        <div className="text-slate-600">This page is a placeholder. Categories have been removed from the product flows.</div>
        <div className="mt-4">
          <Button variant="secondary">Open barcode manager</Button>
        </div>
      </Card>
    </div>
  )
}
