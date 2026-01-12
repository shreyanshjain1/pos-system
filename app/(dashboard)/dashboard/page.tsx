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
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Overview</h2>
        <p className="muted">Quick summary of today's activity</p>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="card skeleton" style={{ height: 92 }} />
          <div className="card skeleton" style={{ height: 92 }} />
          <div className="card skeleton" style={{ height: 92 }} />
        </div>
      )}

      {error && <div className="card" style={{ color: 'red' }}>{error}</div>}

      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="muted">Today's sales</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{data.todaysSales.toFixed ? data.todaysSales.toFixed(2) : data.todaysSales}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div>
              <div className="muted">Total products</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.totalProducts}</div>
            </div>
          </Card>

          <Card>
            <div>
              <div className="muted">Low stock (&lt; 5)</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.lowStock}</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
