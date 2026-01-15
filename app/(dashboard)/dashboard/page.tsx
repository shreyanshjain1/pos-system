"use client"
import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Card } from '@/components/ui/Card'

type Summary = {
  todaysSales: number
  totalProducts: number
  lowStock: number
}

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchSummary() {
      setLoading(true)
      try {
        const res = await fetchWithAuth('/api/summary')
        const json: unknown = await res.json()
        if (!mounted) return
        if (!res.ok) {
          const errMsg = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['error'] : undefined
          throw new Error((errMsg as string) || 'Failed to fetch summary')
        }
        const obj = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {}
        setData({
          todaysSales: Number(obj['todaysSales'] ?? 0),
          totalProducts: Number(obj['totalProducts'] ?? 0),
          lowStock: Number(obj['lowStock'] ?? 0),
        })
      } catch (err: unknown) {
        console.error(err)
        if (!mounted) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg || 'Failed to load summary')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchSummary()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-sm text-slate-500">Quick summary of today&apos;s activity</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-white shadow-sm animate-pulse" />
          <div className="h-24 rounded-xl bg-white shadow-sm animate-pulse" />
          <div className="h-24 rounded-xl bg-white shadow-sm animate-pulse" />
        </div>
      )}

      {error && <div className="text-red-600">{error}</div>}

      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex flex-col">
              <div className="text-sm text-slate-500">Today&apos;s sales</div>
              <div className="text-2xl font-bold mt-2">{data.todaysSales.toFixed ? data.todaysSales.toFixed(2) : data.todaysSales}</div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col">
              <div className="text-sm text-slate-500">Total products</div>
              <div className="text-2xl font-bold mt-2">{data.totalProducts}</div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col">
              <div className="text-sm text-slate-500">Low stock (&lt; 5)</div>
              <div className="text-2xl font-bold mt-2">{data.lowStock}</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
