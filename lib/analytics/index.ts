import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function generateSalesTimeseries(shopId: string, startISO: string, endISO: string) {
  const supabase = getSupabaseAdmin()
  const start = new Date(startISO).toISOString()
  const end = new Date(endISO).toISOString()

  // simple aggregation: total sales amount and count per day
  const sql = `
    SELECT to_char(created_at::date, 'YYYY-MM-DD') as day, COUNT(*)::int as count, SUM(total)::numeric::float as total
    FROM public.sales
    WHERE shop_id = $1 AND created_at >= $2 AND created_at <= $3
    GROUP BY day
    ORDER BY day
  `

  const { data, error } = await (supabase as any).rpc('sql', { q: sql, p1: shopId, p2: start, p3: end })
  if (error) throw error
  return data || []
}

export default { generateSalesTimeseries }
