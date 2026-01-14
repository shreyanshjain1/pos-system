"use client"
import React from 'react'
import Link from 'next/link'

export default function AdminSettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Admin — Settings</h2>
      <p className="text-sm text-slate-500">Placeholder for admin settings. Will be owner-only.</p>
      <p className="mt-4"><Link href="/admin" className="text-emerald-600">← Back to Admin</Link></p>
    </div>
  )
}
