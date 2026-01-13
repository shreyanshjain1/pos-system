"use client"
import React from 'react'
import Link from 'next/link'

export default function AdminProductsPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Admin — Products</h2>
      <p>Placeholder for managing products. Will be owner-only.</p>
      <p><Link href="/admin">← Back to Admin</Link></p>
    </div>
  )
}
