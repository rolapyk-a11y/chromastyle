export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { withImageUrls } from '@/lib/closet/server'
import { loadOutfits } from '@/lib/outfits/server'
import { closetPiece, shopPiece } from '@/lib/outfits/pieces'
import { OutfitsClient } from '@/components/dashboard/outfits-client'
import type { ClothingItem, ColorAnalysis, Outfit, UserItem } from '@/lib/types'

export default async function OutfitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: analyses }, { data: closet }, { data: saved }] = await Promise.all([
    supabase.from('color_analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('user_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('saved_items').select('clothing_item:clothing_items(*)').eq('user_id', user.id),
  ])

  let outfits: Outfit[] = []
  let setupMissing = false
  try {
    outfits = await loadOutfits(supabase, user.id)
  } catch {
    setupMissing = true
  }

  const closetPieces = (await withImageUrls(supabase, (closet ?? []) as UserItem[])).map(closetPiece)
  const shopPieces = ((saved ?? []) as unknown as { clothing_item: ClothingItem | null }[])
    .map((s) => s.clothing_item)
    .filter((c): c is ClothingItem => !!c)
    .map(shopPiece)

  return (
    <OutfitsClient
      colorAnalysis={analyses?.[0] as ColorAnalysis | undefined}
      closet={closetPieces}
      shop={shopPieces}
      initialOutfits={outfits}
      setupMissing={setupMissing}
    />
  )
}
