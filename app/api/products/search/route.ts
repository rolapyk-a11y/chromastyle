import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import seasonReferences from '@/lib/agents/research-output/season-references.json'
import type { SubSeason } from '@/lib/types'

const SERPAPI_URL = 'https://serpapi.com/search'

// Categories to search per colour — kept tight to limit API usage
const SEARCH_CATEGORIES = ['shirt', 'trousers', 'jacket', 'knitwear']

// How many top colours to search per season (controls API usage)
const TOP_COLOURS = 6

// Cache lifetime in days
const CACHE_DAYS = 30

interface SerpApiShoppingResult {
  title: string
  source: string
  product_link: string
  thumbnail: string
  price: string
  rating?: number
  reviews?: number
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[]
}

interface ProductItem {
  id: string
  name: string
  brand: string
  price: string
  image_url: string
  product_url: string
  colour_name: string
  colour_hex: string
  category: string
  sub_season: SubSeason
}

function buildSearchQuery(colourName: string, category: string): string {
  return `${colourName} ${category} men`
}

async function searchSerpApi(query: string): Promise<SerpApiShoppingResult[]> {
  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: process.env.SERPER_API_KEY!,
    gl: 'gb',
    num: '6',
  })

  const res = await fetch(`${SERPAPI_URL}?${params}`)

  if (!res.ok) {
    console.error(`SerpAPI error for "${query}": ${res.status}`)
    return []
  }

  const data: SerpApiResponse = await res.json()
  return data.shopping_results ?? []
}

function parsePrice(priceStr: string): number {
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''))
  return isNaN(num) ? 0 : num
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subSeason = searchParams.get('sub_season') as SubSeason | null

  if (!subSeason) {
    return NextResponse.json({ error: 'sub_season is required' }, { status: 400 })
  }

  const seasonData = (seasonReferences.seasons as Record<string, typeof seasonReferences.seasons['light-spring']>)[subSeason]
  if (!seasonData) {
    return NextResponse.json({ error: `Unknown sub-season: ${subSeason}` }, { status: 400 })
  }

  if (!process.env.SERPER_API_KEY) {
    return NextResponse.json({ error: 'SERPER_API_KEY not configured — add your SerpAPI key to .env.local' }, { status: 500 })
  }

  const supabase = await createClient()

  // ── Check cache ────────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('product_cache')
    .select('products, cached_at')
    .eq('sub_season', subSeason)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached) {
    return NextResponse.json({ products: cached.products, cached: true })
  }

  // ── Fetch from Serper ──────────────────────────────────────────────────────
  const topColours = seasonData.bestColours.slice(0, TOP_COLOURS)
  const products: ProductItem[] = []

  for (const colour of topColours) {
    for (const category of SEARCH_CATEGORIES) {
      const query = buildSearchQuery(colour.name, category)
      const results = await searchSerpApi(query)

      for (const r of results.slice(0, 3)) {
        if (!r.thumbnail || !r.product_link) continue
        products.push({
          id: `${subSeason}-${colour.hex}-${category}-${products.length}`,
          name: r.title,
          brand: r.source,
          price: r.price,
          image_url: r.thumbnail,
          product_url: r.product_link,
          colour_name: colour.name,
          colour_hex: colour.hex,
          category,
          sub_season: subSeason,
        })
      }

      // Small delay to be a good API citizen
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // ── Store in cache ─────────────────────────────────────────────────────────
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + CACHE_DAYS)

  await supabase.from('product_cache').upsert({
    sub_season: subSeason,
    products,
    cached_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  }, { onConflict: 'sub_season' })

  return NextResponse.json({ products, cached: false })
}

// Force-refresh the cache for a sub-season
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subSeason = searchParams.get('sub_season')

  if (!subSeason) {
    return NextResponse.json({ error: 'sub_season is required' }, { status: 400 })
  }

  const supabase = await createClient()
  await supabase.from('product_cache').delete().eq('sub_season', subSeason)

  return NextResponse.json({ cleared: true })
}
