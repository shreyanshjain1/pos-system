import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { shop_id, device_id } = body as Record<string, unknown>
    if (!shop_id || !device_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()

    // Only allow owner/admin users to set authoritative device.
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    let userId: string | undefined
    let callerEmail: string | undefined
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr) throw authErr
      userId = (authData?.user?.id) as string | undefined
      callerEmail = (authData?.user?.email) as string | undefined
      if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 403 })

      // Site owner override (super-admin by email)
      const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
      function isOwnerEmail(email?: string | null) {
        if (!email) return false
        return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
      }
      if (isOwnerEmail(callerEmail ?? null)) {
        // owner may proceed
      } else {
        // Allow if the user is mapped to the shop via `user_shops` OR is the shop owner.
        const [{ data: mappings }, { data: shopRow }] = await Promise.all([
          supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', shop_id).limit(1),
          supabaseAdmin.from('shops').select('id,owner_user_id').eq('id', shop_id).limit(1).maybeSingle(),
        ])

        const isMapped = Array.isArray(mappings) && mappings.length > 0
        const isOwner = (shopRow as any)?.owner_user_id === userId
        if (!isMapped && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Ensure the device is not assigned to any other shop — clear any existing references first to avoid conflicts.
    try {
      await supabaseAdmin
        .from('shops')
        .update({ authoritative_device_id: null })
        .neq('id', shop_id)
        .eq('authoritative_device_id', String(device_id))
    } catch (e: any) {
      // If the column doesn't exist in older schemas, ignore and continue to update the target shop.
      if (!(e?.code === '42703' || (e?.message && String(e.message).includes('authoritative_device_id')))) {
        throw e
      }
    }

    // Try updating authoritative_device_id; if the column is not present in this DB schema,
    // fall back to older shop columns (`offline_primary_device_id`, `pos_device_id`) where available.
    try {
      const { data, error } = await supabaseAdmin
        .from('shops')
        .update({ authoritative_device_id: String(device_id) })
        .eq('id', shop_id)
        .select('id,authoritative_device_id')
        .maybeSingle()
      if (error) throw error
      // audit the change
      try {
        const { auditDeviceEvent } = await import('@/lib/deviceAuth')
        await auditDeviceEvent(supabaseAdmin, { account_id: shop_id, user_id: userId, role: 'admin', oldDeviceId: null, newDeviceId: String(device_id), action: 'set_authoritative', timestamp: new Date().toISOString(), user_agent: req.headers.get('user-agent') ?? null, ip: req.headers.get('x-forwarded-for') ?? null })
      } catch (e) {}
      return NextResponse.json({ data })
    } catch (e: any) {
      const msg = String(e?.message || e)
      const code = e?.code || ''
      if (code === '42703' || msg.includes('authoritative_device_id') || msg.includes("PGRST204")) {
        // Try fallback to `offline_primary_device_id`
        try {
          const { data, error } = await supabaseAdmin
            .from('shops')
            .update({ offline_primary_device_id: String(device_id) })
            .eq('id', shop_id)
            .select('id,offline_primary_device_id')
            .maybeSingle()
          if (!error) return NextResponse.json({ data, warning: 'used offline_primary_device_id fallback' })
        } catch (e2: any) {
          // ignore and try next fallback
        }

        // Try fallback to `pos_device_id`
        try {
          const { data, error } = await supabaseAdmin
            .from('shops')
            .update({ pos_device_id: String(device_id) })
            .eq('id', shop_id)
            .select('id,pos_device_id')
            .maybeSingle()
          if (!error) return NextResponse.json({ data, warning: 'used pos_device_id fallback' })
        } catch (e3: any) {
          // ignore
        }

        return NextResponse.json({ error: 'Database schema missing `authoritative_device_id`. Run the migration to add it.' }, { status: 500 })
      }
      throw e
    }
  } catch (err: unknown) {
    console.error('set-authoritative error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
