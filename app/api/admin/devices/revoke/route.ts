import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
function isOwnerEmail(email?: string | null) {
  if (!email) return false
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()

    // Validate token and get caller
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const callerEmail = (authData as unknown as { user?: { email?: string } })?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await req.json().catch(() => ({} as unknown))
    const bodyRec = body as unknown as Record<string, unknown>
    const id = bodyRec?.id ?? null
    const user_id = bodyRec?.user_id ?? null
    const device_id = bodyRec?.device_id ?? null

    if (!id && !(user_id && device_id)) {
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 })
    }

    // Mark device as revoked (is_revoked = true) instead of deleting rows
    let updRes
    if (id) {
      updRes = await supabaseAdmin.from('user_devices').update({ is_revoked: true }).eq('id', id).select()
    } else {
      updRes = await supabaseAdmin.from('user_devices').update({ is_revoked: true }).match({ user_id, device_id }).select()
    }

    if (updRes.error) throw updRes.error

    const notify = (body as unknown as Record<string, unknown>)?.notify === true
    // attempt to notify user: insert notification row and send email if SMTP configured
    try {
      // determine user id and email
      const affected = (updRes.data && Array.isArray(updRes.data) && (updRes.data as unknown[]).length) ? (updRes.data as unknown[])[0] : null
      const targetUserId = id ? (affected as unknown as Record<string, unknown>)?.user_id : user_id

      if (notify && targetUserId) {
        // determine payload device id safely
        const payloadDeviceId = device_id ?? ((affected as unknown as Record<string, unknown>)?.device_id ?? null)
        // insert notification record
        await supabaseAdmin.from('user_notifications').insert([{ user_id: targetUserId, type: 'device_revoked', payload: JSON.stringify({ device_id: payloadDeviceId, note: 'Device revoked by admin' }) }])

        // try to resolve user email via admin list
        try {
          const usersRes = await (supabaseAdmin.auth as unknown as { admin: { listUsers: (opts: { per_page: number }) => Promise<{ data?: { users?: unknown[] }; error?: unknown }> } }).admin.listUsers({ per_page: 200 })
          const users = (usersRes?.data as unknown as { users?: unknown[] })?.users || []
          const u = (users as unknown[]).find((x: unknown) => (x as unknown as Record<string, unknown>)?.id === targetUserId)
          const email = (u as unknown as Record<string, unknown>)?.email
          if (email && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM) {
            // send email via nodemailer
            try {
              const nodemailer = await import('nodemailer')
              const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: !!process.env.SMTP_SECURE, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
              const info = await transporter.sendMail({ from: process.env.EMAIL_FROM, to: String(email), subject: 'Device revoked', text: `Your device was revoked by the account owner. If this was unexpected, please contact support.` })
              console.log('Revoke email sent', (info as unknown as { messageId?: string })?.messageId)
            } catch (e) {
              console.warn('Failed to send revoke email', e)
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      console.warn('Notification attempt failed', e)
    }

    // Audit the revoke action (best-effort)
    try {
      const affected = (updRes.data && Array.isArray(updRes.data) && (updRes.data as unknown[]).length) ? (updRes.data as unknown[])[0] : null
      const targetDeviceId = device_id ?? ((affected as unknown as Record<string, unknown>)?.device_id ?? null)
      const targetUserId = id ? (affected as unknown as Record<string, unknown>)?.user_id : user_id
      const callerId = (authData as any)?.user?.id ?? null
      const { auditDeviceEvent } = await import('@/lib/deviceAuth')
      await auditDeviceEvent(supabaseAdmin, { accountId: null, userId: callerId, role: 'owner', oldDeviceId: targetDeviceId, newDeviceId: null, action: 'revoke_device', timestamp: new Date().toISOString(), ip: req.headers.get('x-forwarded-for') ?? null, userAgent: req.headers.get('user-agent') ?? null, target_user_id: targetUserId })
    } catch (e) {
      // ignore audit failures
    }

    return NextResponse.json({ data: updRes.data })
  } catch (err: unknown) {
    console.error('admin/devices/revoke POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

