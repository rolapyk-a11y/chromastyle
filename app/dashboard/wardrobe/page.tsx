import { createClient } from '@/lib/supabase/server'
import { WardrobeClient } from '@/components/dashboard/wardrobe-client'
import { ColorAnalysis, ClothingItem } from '@/lib/types'
import type { WardrobeSeedItem } from '@/lib/wardrobe-seed'

// Attempt to load the agent-generated wardrobe seed (exists after populate-wardrobe runs).
// Falls back gracefully when the file is empty (before the agent runs).
async function getAgentWardrobeItems(subSeason: string | undefined): Promise<ClothingItem[]> {
  if (!subSeason) return []
  try {
    const { WARDROBE_BY_SUB_SEASON } = await import('@/lib/wardrobe-seed')
    const seedItems = (WARDROBE_BY_SUB_SEASON[subSeason as keyof typeof WARDROBE_BY_SUB_SEASON] ?? []) as WardrobeSeedItem[]
    return seedItems.map((item: WardrobeSeedItem, i: number) => ({
      ...item,
      id: `seed-${subSeason}-${i}`,
      subcategory: item.subcategory ?? null,
      product_url: item.product_url ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as ClothingItem[]
  } catch {
    return []
  }
}

export default async function WardrobePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's latest color analysis
  const { data: analyses } = await supabase
    .from('color_analyses')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const colorAnalysis = analyses?.[0] as ColorAnalysis | undefined

  // Get all clothing items from Supabase
  let { data: clothingItems } = await supabase
    .from('clothing_items')
    .select('*')
    .order('created_at', { ascending: false })

  // If no items in Supabase, try to seed them from the legacy mock data
  if (!clothingItems || clothingItems.length === 0) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seed-clothing`, {
      method: 'POST'
    }).catch(() => {})

    const { data: refetched } = await supabase
      .from('clothing_items')
      .select('*')
      .order('created_at', { ascending: false })

    clothingItems = refetched
  }

  // Merge in agent-generated wardrobe items for the user's specific sub-season.
  // These are pre-curated real H&M products matched to the user's exact palette.
  const agentItems = await getAgentWardrobeItems(colorAnalysis?.sub_season)
  const supabaseItems = (clothingItems ?? []) as ClothingItem[]

  // Agent items take priority (shown first) since they are sub-season matched.
  // De-duplicate by product_url so DB items don't appear twice if already seeded.
  const agentUrls = new Set(agentItems.map(i => i.product_url).filter(Boolean))
  const merged = [
    ...agentItems,
    ...supabaseItems.filter(i => !agentUrls.has(i.product_url ?? '')),
  ]

  // Get user's saved items
  const { data: savedItems } = await supabase
    .from('saved_items')
    .select('clothing_item_id')
    .eq('user_id', user?.id)

  const savedItemIds = savedItems?.map(item => item.clothing_item_id) ?? []

  return (
    <WardrobeClient
      colorAnalysis={colorAnalysis}
      clothingItems={merged}
      savedItemIds={savedItemIds}
    />
  )
}
