export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { withImageUrls } from '@/lib/closet/server'
import { ClosetClient } from '@/components/dashboard/closet-client'
import type { ColorAnalysis, UserItem } from '@/lib/types'

export default async function ClosetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: analyses }, { data: items, error }] = await Promise.all([
    supabase
      .from('color_analyses')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('user_items')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <ClosetClient
      colorAnalysis={analyses?.[0] as ColorAnalysis | undefined}
      initialItems={await withImageUrls(supabase, (items ?? []) as UserItem[])}
      setupMissing={!!error}
    />
  )
}
