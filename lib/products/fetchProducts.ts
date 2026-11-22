import { createClient } from '@/lib/supabase/server'
import seasonReferences from '@/lib/agents/research-output/season-references.json'
import type { SubSeason, ClothingItem } from '@/lib/types'

// Google Shopping via serper.dev (the SERPER_API_KEY belongs to serper.dev, not serpapi.com)
const SERPER_URL = 'https://google.serper.dev/shopping'
const SEARCH_CATEGORIES = ['shirt', 'trousers', 'jacket']
const TOP_COLOURS = 3
const CACHE_DAYS = 30

interface SerpResult {
  title: string
  source: string
  product_link: string
  thumbnail: string
  price: string
}

async function serpSearch(query: string, apiKey: string): Promise<SerpResult[]> {
  try {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'dk', hl: 'da' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      console.error(`[fetchProducts] Serper ${res.status} for "${query}"`)
      return []
    }
    const data = (await res.json()) as { shopping?: Record<string, unknown>[] }
    return (data.shopping ?? []).map((r) => ({
      title: String(r.title ?? ''),
      source: String(r.source ?? ''),
      product_link: String(r.link ?? ''),
      thumbnail: String(r.imageUrl ?? ''),
      price: String(r.price ?? ''),
    }))
  } catch (e) {
    console.error(`[fetchProducts] fetch error for "${query}":`, e)
    return []
  }
}

export async function fetchProductsForSeason(subSeason: SubSeason): Promise<ClothingItem[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    console.error('[fetchProducts] SERPER_API_KEY is not set in .env.local')
    return []
  }

  const supabase = await createClient()

  // ── Check Supabase cache ──────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('product_cache')
    .select('products')
    .eq('sub_season', subSeason)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached?.products?.length) {
    console.log(`[fetchProducts] cache hit for ${subSeason}: ${cached.products.length} products`)
    return mapToClothingItems(cached.products)
  }

  // ── Fetch from SerpAPI ────────────────────────────────────────────────────
  console.log(`[fetchProducts] cache miss — calling SerpAPI for ${subSeason}`)

  const seasonData = (seasonReferences.seasons as Record<string, { bestColours: { name: string; hex: string }[] }>)[subSeason]
  if (!seasonData) {
    console.error(`[fetchProducts] unknown sub-season: ${subSeason}`)
    return []
  }

  const topColours = seasonData.bestColours.slice(0, TOP_COLOURS)
  const raw: object[] = []

  for (const colour of topColours) {
    for (const category of SEARCH_CATEGORIES) {
      const results = await serpSearch(`herre ${colour.name} ${category}`, apiKey)
      for (const r of results.slice(0, 3)) {
        if (!r.thumbnail || !r.product_link) continue
        raw.push({
          id: `${subSeason}-${colour.hex}-${category}-${raw.length}`,
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
      await new Promise(r => setTimeout(r, 150))
    }
  }

  console.log(`[fetchProducts] SerpAPI returned ${raw.length} products for ${subSeason}`)

  // ── Cache in Supabase ─────────────────────────────────────────────────────
  if (raw.length > 0) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + CACHE_DAYS)
    const { error } = await supabase.from('product_cache').upsert({
      sub_season: subSeason,
      products: raw,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'sub_season' })
    if (error) console.error('[fetchProducts] cache write error:', error.message)
  }

  return mapToClothingItems(raw)
}

function mapToClothingItems(raw: object[]): ClothingItem[] {
  return (raw as Array<{
    id: string; name: string; brand: string; price: string;
    image_url: string; product_url: string; colour_name: string;
    colour_hex: string; category: string;
  }>).map((p, i) => ({
    id: p.id ?? `product-${i}`,
    name: p.name,
    brand: p.brand ?? '',
    category: p.category,
    subcategory: p.colour_name,
    price: parseFloat(p.price?.replace(/[^0-9,]/g, '').replace(',', '.') ?? '0') || 0,
    currency: 'DKK',
    image_url: p.image_url,
    product_url: p.product_url,
    colors: [p.colour_hex],
    seasons: [],
    style_tags: [p.colour_name, p.category],
    is_trending: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}
