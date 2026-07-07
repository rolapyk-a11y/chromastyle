import { createClient } from '@/lib/supabase/server'
import type { ClothingItem, SubSeason } from '@/lib/types'

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape'

export interface CatalogScrapeInput {
  urls: string[]
  subSeason: SubSeason
  colourName: string
  colourHex: string
  category?: string
  brand?: string
  limit?: number
}

interface ExtractedCatalogProduct {
  name?: string
  brand?: string
  price?: string
  currency?: string
  image_url?: string
  product_url?: string
  category?: string
  colour_name?: string
  colour_hex?: string
  fit?: string
  fabric?: string
}

interface FirecrawlResponse {
  success?: boolean
  data?: {
    json?: {
      products?: ExtractedCatalogProduct[]
    }
    product?: {
      title?: string
      url?: string
      brand?: string
      category?: string
      variants?: Array<{
        title?: string
        price?: {
          formatted?: string
          currency?: string
          amount?: number
        }
        images?: Array<{ url?: string; alt?: string }>
        availability?: { inStock?: boolean; text?: string }
      }>
    }
    metadata?: {
      title?: string
      sourceURL?: string
      url?: string
    }
  }
  error?: string
}

const catalogProductSchema = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          price: { type: 'string' },
          currency: { type: 'string' },
          image_url: { type: 'string' },
          product_url: { type: 'string' },
          category: { type: 'string' },
          colour_name: { type: 'string' },
          colour_hex: { type: 'string' },
          fit: { type: 'string' },
          fabric: { type: 'string' },
        },
        required: ['name', 'product_url'],
      },
    },
  },
  required: ['products'],
}

function parsePrice(price: string | undefined): number {
  if (!price) return 0
  const value = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return Number.isFinite(value) ? value : 0
}

function normaliseUrl(productUrl: string | undefined, sourceUrl: string): string | null {
  if (!productUrl) return null
  try {
    return new URL(productUrl, sourceUrl).toString()
  } catch {
    return productUrl
  }
}

function productsFromFirecrawl(
  response: FirecrawlResponse,
  sourceUrl: string,
  input: Omit<CatalogScrapeInput, 'urls'>,
): ExtractedCatalogProduct[] {
  const extracted = response.data?.json?.products ?? []
  if (extracted.length > 0) return extracted

  const product = response.data?.product
  if (!product?.title) return []

  const firstVariant = product.variants?.[0]
  return [{
    name: firstVariant?.title || product.title,
    brand: product.brand,
    price: firstVariant?.price?.formatted,
    currency: firstVariant?.price?.currency,
    image_url: firstVariant?.images?.[0]?.url,
    product_url: product.url || response.data?.metadata?.sourceURL || sourceUrl,
    category: product.category || input.category,
    colour_name: input.colourName,
    colour_hex: input.colourHex,
  }]
}

async function scrapeUrl(
  url: string,
  input: Omit<CatalogScrapeInput, 'urls'>,
  apiKey: string,
): Promise<ExtractedCatalogProduct[]> {
  const res = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: [
        'product',
        {
          type: 'json',
          schema: catalogProductSchema,
          prompt: [
            'Extract menswear products from this catalog or product page.',
            'Return product cards only. Include real product URLs and image URLs when visible.',
            `The intended colour tag is ${input.colourName} (${input.colourHex}).`,
            input.category ? `The intended category tag is ${input.category}.` : '',
          ].filter(Boolean).join(' '),
        },
      ],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      mobile: false,
      timeout: 60000,
      maxAge: 172800000,
      location: { country: 'GB', languages: ['en-GB'] },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Firecrawl ${res.status} for ${url}: ${text.slice(0, 240)}`)
  }

  const data = await res.json() as FirecrawlResponse
  if (data.error) throw new Error(`Firecrawl error for ${url}: ${data.error}`)
  return productsFromFirecrawl(data, url, input)
}

export async function scrapeCatalogs(input: CatalogScrapeInput) {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set in .env.local')

  const limit = Math.min(Math.max(input.limit ?? 24, 1), 60)
  const products: Array<ExtractedCatalogProduct & { source_url: string }> = []
  const errors: Array<{ url: string; error: string }> = []

  for (const url of input.urls) {
    try {
      const scraped = await scrapeUrl(url, input, apiKey)
      for (const product of scraped) {
        if (products.length >= limit) break
        products.push({ ...product, source_url: url })
      }
    } catch (error) {
      errors.push({ url, error: error instanceof Error ? error.message : String(error) })
    }
    if (products.length >= limit) break
  }

  const supabase = await createClient()
  const rows = products
    .map((product, index) => {
      const productUrl = normaliseUrl(product.product_url, product.source_url)
      if (!product.name || !productUrl) return null
      return {
        source_url: product.source_url,
        product_url: productUrl,
        name: product.name,
        brand: product.brand || input.brand || 'Catalog',
        category: product.category || input.category || 'clothing',
        price: parsePrice(product.price),
        currency: product.currency || 'GBP',
        image_url: normaliseUrl(product.image_url, product.source_url) || '',
        colour_name: product.colour_name || input.colourName,
        colour_hex: product.colour_hex || input.colourHex,
        sub_season: input.subSeason,
        fit: product.fit || null,
        fabric: product.fabric || null,
        raw: product,
        scraped_at: new Date().toISOString(),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    const cacheKey = `firecrawl:${input.subSeason}`
    const { data: cached } = await supabase
      .from('product_cache')
      .select('products')
      .eq('sub_season', cacheKey)
      .maybeSingle()

    const existing = Array.isArray(cached?.products) ? cached.products : []
    const byUrl = new Map<string, typeof rows[number]>()
    for (const product of existing as typeof rows) {
      if (product.product_url) byUrl.set(product.product_url, product)
    }
    for (const product of rows) {
      byUrl.set(product.product_url, product)
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const { error } = await supabase
      .from('product_cache')
      .upsert({
        sub_season: cacheKey,
        products: Array.from(byUrl.values()),
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'sub_season' })
    if (error) errors.push({ url: 'supabase:product_cache', error: error.message })
  }

  return { products: rows, errors }
}

export async function fetchCatalogProductsForSeason(subSeason: SubSeason): Promise<ClothingItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_cache')
    .select('products')
    .eq('sub_season', `firecrawl:${subSeason}`)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !data || !Array.isArray(data.products)) return []

  return data.products.map((item, index) => ({
    id: `catalog-${item.id ?? index}`,
    name: item.name,
    brand: item.brand,
    category: item.category,
    subcategory: item.colour_name,
    price: item.price ?? 0,
    currency: item.currency ?? 'GBP',
    image_url: item.image_url ?? '',
    product_url: item.product_url,
    colors: [item.colour_hex],
    seasons: [],
    style_tags: [
      item.colour_name,
      item.category,
      item.fit,
      item.fabric,
      'catalog',
    ].filter(Boolean),
    is_trending: false,
    created_at: item.scraped_at,
    updated_at: item.scraped_at,
  })) as ClothingItem[]
}
