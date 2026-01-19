import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'
import { generateSalesTimeseries } from '@/lib/analytics'
import { rowsToCsv } from '@/lib/analytics/csv'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { shop_id, start, end } = body || {}
    if (!shop_id || !start || !end) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const token = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(token)
    if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = authData.user.id

    // ensure user is mapped to the requested shop
    const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', shop_id).limit(1)
    if (!mapping || (mapping as any).length === 0) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

    const status = await getSubscriptionStatus(supabaseAdmin, userId)
    if (!status.active) return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
    if ((String(status.pos_type || '').toLowerCase()) !== 'retail') return NextResponse.json({ error: 'Not a retail subscription' }, { status: 403 })
    const plan = String(status.plan || '').toLowerCase()
    if (plan !== 'advance') return NextResponse.json({ error: 'Advanced plan required' }, { status: 403 })

    const rows = await generateSalesTimeseries(String(shop_id), String(start), String(end))
    // ensure we have an array of objects
    const csv = rowsToCsv(rows || [])

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="report_${shop_id}_${start}_${end}.csv"`
      }
    })
  } catch (e: any) {
    console.error('/api/exports/reports error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
