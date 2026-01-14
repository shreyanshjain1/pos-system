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
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch summary')
        setData({
          todaysSales: Number(json.todaysSales || 0),
          totalProducts: Number(json.totalProducts || 0),
          lowStock: Number(json.lowStock || 0),
        })
      } catch (err: any) {
        console.error(err)
        if (!mounted) return
        setError(err?.message || 'Failed to load summary')
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
        <p className="text-sm text-slate-500">Quick summary of today's activity</p>
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
              <div className="text-sm text-slate-500">Today's sales</div>
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
