import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type SupabaseAuthLike = { getUser: (token: string) => Promise<{ data?: unknown; error?: unknown }> }
type SupabaseUserData = { user?: { id?: string; email?: string } }

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = (await params) as { id?: string }
    const orderId = resolved?.id

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Delete the supply order (mark as delivered by deleting)
    const { error } = await supabaseAdmin
      .from('supply_orders')
      .delete()
      .eq('id', orderId)

    if (error) {
      console.error('Failed to delete supply order:', error)
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: unknown) {
    console.error('Supply order DELETE error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
