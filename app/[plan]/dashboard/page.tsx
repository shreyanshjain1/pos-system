import { supabase } from '@/lib/supabase/client'
import getShopForUserOrCreate from '@/lib/getShop'
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: { plan: string } }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const sessionObj = sessionData as unknown as { session?: { user?: { id?: string } } } | undefined
  const userId = sessionObj?.session?.user?.id ?? null
  if (!userId) return redirect('/login')

  const shop = await getShopForUserOrCreate(userId)
  if (!shop.pos_type || shop.pos_type === '') return redirect('/onboarding/choose-type')
  return redirect(`/${params.plan}/${shop.pos_type}/dashboard`)
}
