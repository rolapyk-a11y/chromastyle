export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { WardrobeClient } from '@/components/dashboard/wardrobe-client'
import { LocalAnalysisSync } from '@/components/dashboard/local-analysis-sync'
import { fetchProductsForSeason } from '@/lib/products/fetchProducts'
import { fetchCatalogProductsForSeason } from '@/lib/products/firecrawl'
import { fetchUniqloProductsForSeason } from '@/lib/products/uniqloCache'
import { ColorAnalysis, ClothingItem, SubSeason } from '@/lib/types'

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

  // Fetch real Google Shopping products matched to the user's exact sub-season.
  // Results are cached in Supabase — only the first load costs Serper credits.
  const uniqloProducts = colorAnalysis?.sub_season
    ? fetchUniqloProductsForSeason(colorAnalysis.sub_season as SubSeason)
    : []
  const scrapedProducts = colorAnalysis?.sub_season
    ? await fetchCatalogProductsForSeason(colorAnalysis.sub_season as SubSeason)
    : []
  const shoppingProducts = colorAnalysis?.sub_season
    ? await fetchProductsForSeason(colorAnalysis.sub_season as SubSeason)
    : []
  const realProducts = [...uniqloProducts, ...scrapedProducts, ...shoppingProducts]
  const supabaseItems = (clothingItems ?? []) as ClothingItem[]

  // Real products take priority (shown first). De-duplicate by product_url.
  const realUrls = new Set(realProducts.map(i => i.product_url).filter(Boolean))
  const merged = [
    ...realProducts,
    ...supabaseItems.filter(i => !realUrls.has(i.product_url ?? '')),
  ]

  // Get user's saved items
  const { data: savedItems } = await supabase
    .from('saved_items')
    .select('clothing_item_id')
    .eq('user_id', user?.id)

  const savedItemIds = savedItems?.map(item => item.clothing_item_id) ?? []

  return (
    <>
      {/* If no Supabase analysis yet, sync from localStorage then refresh */}
      {!colorAnalysis && <LocalAnalysisSync />}
      <WardrobeClient
        signedIn={!!user}
        colorAnalysis={colorAnalysis}
        clothingItems={merged}
        savedItemIds={savedItemIds}
      />
    </>
  )
}

