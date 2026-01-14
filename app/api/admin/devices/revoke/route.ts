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
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const callerEmail = (authData as any)?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const id = body?.id ?? null
    const user_id = body?.user_id ?? null
    const device_id = body?.device_id ?? null

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

    const notify = body?.notify === true
    // attempt to notify user: insert notification row and send email if SMTP configured
    try {
      // determine user id and email
      const affected = updRes.data && updRes.data.length ? updRes.data[0] : null
      const targetUserId = id ? affected?.user_id : user_id

      if (notify && targetUserId) {
        // insert notification record
        await supabaseAdmin.from('user_notifications').insert([{ user_id: targetUserId, type: 'device_revoked', payload: JSON.stringify({ device_id: device_id || affected?.device_id || null, note: 'Device revoked by admin' }) }])

        // try to resolve user email via admin list
        try {
          const usersRes = await (supabaseAdmin.auth as any).admin.listUsers({ per_page: 200 })
          const users = usersRes?.data?.users || []
          const u = users.find((x: any) => x.id === targetUserId)
          const email = u?.email
          if (email && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM) {
            // send email via nodemailer
            try {
              const nodemailer = await import('nodemailer')
              const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: !!process.env.SMTP_SECURE, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
              const info = await transporter.sendMail({ from: process.env.EMAIL_FROM, to: email, subject: 'Device revoked', text: `Your device was revoked by the account owner. If this was unexpected, please contact support.` })
              console.log('Revoke email sent', info?.messageId)
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

    return NextResponse.json({ data: updRes.data })
  } catch (err: any) {
    console.error('admin/devices/revoke POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
