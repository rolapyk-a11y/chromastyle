#!/usr/bin/env tsx
import { config } from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import seasonReferences from '../lib/agents/research-output/season-references.json'
import type { SubSeason } from '../lib/types'

config({ path: '.env.local' })

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape'
const OUTPUT_PATH = path.join(process.cwd(), 'lib', 'products', 'uniqlo-men-cache.json')

const UNIQLO_MEN_CATALOGS = [
  { url: 'https://www.uniqlo.com/uk/en/men/shirts-and-polos', category: 'shirts' },
  { url: 'https://www.uniqlo.com/uk/en/men/shirts-and-polos/casual-shirts', category: 'shirts' },
  { url: 'https://www.uniqlo.com/uk/en/men/shirts-and-polos/polo-shirts', category: 'tops' },
  { url: 'https://www.uniqlo.com/uk/en/men/tops/t-shirts', category: 'tops' },
  { url: 'https://www.uniqlo.com/uk/en/men/bottoms', category: 'pants' },
  { url: 'https://www.uniqlo.com/uk/en/men/bottoms/casual-trousers', category: 'pants' },
  { url: 'https://www.uniqlo.com/uk/en/men/bottoms/wide-trousers', category: 'pants' },
  { url: 'https://www.uniqlo.com/uk/en/men/outerwear', category: 'outerwear' },
  { url: 'https://www.uniqlo.com/uk/en/men/jumpers', category: 'knitwear' },
]

const SUB_SEASONS: SubSeason[] = [
  'light-spring', 'true-spring', 'warm-spring',
  'light-summer', 'true-summer', 'soft-summer',
  'soft-autumn', 'true-autumn', 'dark-autumn',
  'dark-winter', 'true-winter', 'clear-winter',
]

interface ExtractedProduct {
  name?: string
  product_url?: string
  image_url?: string
  price?: string
  currency?: string
  colour_name?: string
  colour_hex?: string
  fit?: string
  fabric?: string
  category?: string
}

interface CachedUniqloProduct {
  id: string
  name: string
  brand: 'Uniqlo'
  category: string
  price: number
  currency: string
  image_url: string
  product_url: string
  colour_name: string
  colour_hex: string
  sub_seasons: SubSeason[]
  fit?: string | null
  fabric?: string | null
  scraped_at: string
}

interface FirecrawlResponse {
  data?: {
    json?: {
      products?: ExtractedProduct[]
    }
  }
  error?: string
}

const schema = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          product_url: { type: 'string' },
          image_url: { type: 'string' },
          price: { type: 'string' },
          currency: { type: 'string' },
          colour_name: { type: 'string' },
          colour_hex: { type: 'string' },
          fit: { type: 'string' },
          fabric: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['name', 'product_url'],
      },
    },
  },
  required: ['products'],
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function distance(a: string, b: string): number {
  const aa = hexToRgb(a)
  const bb = hexToRgb(b)
  if (!aa || !bb) return Number.POSITIVE_INFINITY
  return Math.sqrt(
    (aa[0] - bb[0]) ** 2 +
    (aa[1] - bb[1]) ** 2 +
    (aa[2] - bb[2]) ** 2,
  )
}

function parsePrice(price: string | undefined): number {
  if (!price) return 0
  const value = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return Number.isFinite(value) ? value : 0
}

function absoluteUrl(url: string | undefined, base: string): string {
  if (!url) return ''
  try {
    return new URL(url, base).toString()
  } catch {
    return url
  }
}

function seasonMatches(hex: string): SubSeason[] {
  const matches = SUB_SEASONS
    .map(subSeason => {
      const season = (seasonReferences.seasons as Record<string, { bestColours: { hex: string }[] }>)[subSeason]
      const bestDistance = Math.min(...season.bestColours.map(colour => distance(hex, colour.hex)))
      return { subSeason, bestDistance }
    })
    .sort((a, b) => a.bestDistance - b.bestDistance)

  const goodMatches = matches.filter(match => match.bestDistance <= 95).map(match => match.subSeason)
  return goodMatches.length > 0 ? goodMatches.slice(0, 3) : matches.slice(0, 1).map(match => match.subSeason)
}

async function scrapeCatalog(apiKey: string, catalog: { url: string; category: string }) {
  const res = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: catalog.url,
      formats: [{
        type: 'json',
        schema,
        prompt: [
          'Extract all visible menswear product cards from this Uniqlo catalog page.',
          'For each product include its exact product URL, image URL, displayed price, actual displayed colour name, and best estimate colour hex.',
          'If fit or fabric is visible in the product name or text, include it.',
          `Default category is ${catalog.category}.`,
        ].join(' '),
      }],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      timeout: 60000,
      maxAge: 86400000,
      location: { country: 'GB', languages: ['en-GB'] },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 240)}`)
  }

  const data = await res.json() as FirecrawlResponse
  if (data.error) throw new Error(data.error)
  return data.data?.json?.products ?? []
}

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY is not set in .env.local')
    process.exit(1)
  }

  const allProducts: CachedUniqloProduct[] = []
  const seen = new Set<string>()

  for (const catalog of UNIQLO_MEN_CATALOGS) {
    console.log(`Scraping ${catalog.url}`)
    const products = await scrapeCatalog(apiKey, catalog)
    console.log(`  Firecrawl extracted ${products.length} products`)

    for (const product of products) {
      const colourHex = product.colour_hex?.startsWith('#')
        ? product.colour_hex
        : product.colour_hex
          ? `#${product.colour_hex}`
          : ''
      if (!product.name || !product.product_url || !product.image_url || !hexToRgb(colourHex)) continue

      const productUrl = absoluteUrl(product.product_url, catalog.url)
      const key = `${productUrl}|${colourHex}`
      if (seen.has(key)) continue
      seen.add(key)

      allProducts.push({
        id: `uniqlo-${allProducts.length}`,
        name: product.name,
        brand: 'Uniqlo',
        category: product.category || catalog.category,
        price: parsePrice(product.price),
        currency: product.currency || 'GBP',
        image_url: absoluteUrl(product.image_url, catalog.url),
        product_url: productUrl,
        colour_name: product.colour_name || 'Uniqlo colour',
        colour_hex: colourHex,
        sub_seasons: seasonMatches(colourHex),
        fit: product.fit || null,
        fabric: product.fabric || null,
        scraped_at: new Date().toISOString(),
      })
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(allProducts, null, 2))
  console.log(`Wrote ${allProducts.length} Uniqlo products to ${OUTPUT_PATH}`)

  const bySeason = new Map<SubSeason, number>()
  for (const product of allProducts) {
    for (const season of product.sub_seasons) {
      bySeason.set(season, (bySeason.get(season) ?? 0) + 1)
    }
  }
  for (const season of SUB_SEASONS) {
    console.log(`${season}: ${bySeason.get(season) ?? 0}`)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
