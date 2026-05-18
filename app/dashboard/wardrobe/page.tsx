import { createClient } from '@/lib/supabase/server'
import { WardrobeClient } from '@/components/dashboard/wardrobe-client'
import { LocalAnalysisSync } from '@/components/dashboard/local-analysis-sync'
import { ColorAnalysis, ClothingItem } from '@/lib/types'

// Fetch real products from Google Shopping via our Serper-backed API.
// Results are cached in Supabase for 30 days — only the first load per
// sub-season costs API credits.
async function getRealProducts(subSeason: string | undefined): Promise<ClothingItem[]> {
  if (!subSeason || !process.env.SERPER_API_KEY) return []
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/products/search?sub_season=${subSeason}`, {
      next: { revalidate: 60 * 60 * 24 }, // 24h Next.js cache on top of Supabase cache
    })
    if (!res.ok) return []
    const { products } = await res.json()
    return (products ?? []).map((p: {
      id: string; name: string; brand: string; price: string;
      image_url: string; product_url: string; colour_name: string;
      colour_hex: string; category: string;
    }, i: number) => ({
      id: p.id ?? `product-${i}`,
      name: p.name,
      brand: p.brand,
      category: p.category,
      subcategory: p.colour_name,
      price: parseFloat(p.price?.replace(/[^0-9.]/g, '') ?? '0') || 0,
      currency: 'GBP',
      image_url: p.image_url,
      product_url: p.product_url,
      colors: [p.colour_hex],
      seasons: [],
      style_tags: [p.colour_name, p.category],
      is_trending: false,
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

  // Fetch real Google Shopping products matched to the user's exact sub-season.
  // Results are cached in Supabase — only the first load costs Serper credits.
  const realProducts = await getRealProducts(colorAnalysis?.sub_season)
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
        colorAnalysis={colorAnalysis}
        clothingItems={merged}
        savedItemIds={savedItemIds}
      />
    </>
  )
}
