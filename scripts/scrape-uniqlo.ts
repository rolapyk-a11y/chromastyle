/**
 * Uniqlo catalogue scraper  (PERSONAL USE)
 * ----------------------------------------
 * Pulls product data from Uniqlo's own public JSON API (the same endpoint the
 * uniqlo.com website calls) and writes a CSV that the existing feed ingester
 * understands. You then run:
 *
 *     npx tsx scripts/scrape-uniqlo.ts            # -> scripts/uniqlo-feed.csv
 *     npm run ingest-feed -- scripts/uniqlo-feed.csv
 *
 * The ingester downloads each image, extracts the real garment colour, and
 * tags fabric/cut/category — so this script only needs name/price/image/url.
 *
 * ⚠ Personal/local use only. Don't ship the resulting product-catalog.json to a
 *    public deploy — those product images are Uniqlo's. Swap to a real affiliate
 *    feed before going public.
 *
 * To add more categories (women's, bottoms, shoes…): browse that category on
 * uniqlo.com with DevTools → Network → Fetch/XHR open, copy the `products?...`
 * Request URL, and paste it into CATEGORY_URLS below. The script re-paginates
 * each one automatically (it overrides offset/limit).
 */

import fs from 'fs'
import path from 'path'

// ─── Configure which categories to pull ───────────────────────────────────────
// Each entry is a full "products?..." Request URL copied from the browser.
const CATEGORY_URLS: string[] = [
  // Men — Tops
  'https://www.uniqlo.com/dk/api/commerce/v5/en/products?path=37609%2C84995%2C%2C&genderId=37609&offset=0&limit=36&imageRatio=3x4&rankingGender=men&rankingClassId=84995&httpFailure=true',
  // Men — Jeans, Trousers & Shorts
  'https://www.uniqlo.com/dk/api/commerce/v5/en/products?path=37609%2C84996%2C%2C&genderId=37609&offset=0&limit=36&imageRatio=3x4&rankingGender=men&rankingClassId=84996&httpFailure=true',
  // ↓ paste more category URLs here, e.g. women's tops, shoes, etc.
]

const PAGE_SIZE = 100                       // Uniqlo accepts up to ~100 per page
const OUTPUT = path.join(__dirname, 'uniqlo-feed.csv')
const BASE_PRODUCT_URL = 'https://www.uniqlo.com/dk/en/products'

// Browser-like headers — the API rejects bare requests.
const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setParam(url: string, key: string, value: string): string {
  const u = new URL(url)
  u.searchParams.set(key, value)
  return u.toString()
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Defensive field extraction — Uniqlo's JSON shape is stable but we guard anyway.
interface RawItem {
  productId?: string
  name?: string
  prices?: {
    base?: { value?: number; currency?: { code?: string } }
    promo?: { value?: number } | null
  }
  images?: { main?: Record<string, { image?: string }> | Array<{ image?: string }> }
  colors?: Array<{ name?: string }>
}

function firstImage(item: RawItem): string {
  const main = item.images?.main
  if (!main) return ''
  const list = Array.isArray(main) ? main : Object.values(main)
  for (const m of list) if (m?.image) return m.image
  return ''
}

function mapRow(item: RawItem) {
  const name = item.name ?? ''
  const image_url = firstImage(item)
  const product_url = item.productId ? `${BASE_PRODUCT_URL}/${item.productId}` : ''
  const price = item.prices?.promo?.value ?? item.prices?.base?.value ?? ''
  const currency = item.prices?.base?.currency?.code ?? 'DKK'
  const color = item.colors?.[0]?.name ?? ''
  return { name, brand: 'Uniqlo', category: '', price, currency, image_url, product_url, color }
}

// ─── Fetch one category, paginating until exhausted ───────────────────────────

async function fetchCategory(seedUrl: string, dumpFirst: boolean): Promise<RawItem[]> {
  const all: RawItem[] = []
  let offset = 0
  let total = Infinity

  while (offset < total) {
    const url = setParam(setParam(seedUrl, 'limit', String(PAGE_SIZE)), 'offset', String(offset))
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) {
      console.error(`  ✗ HTTP ${res.status} at offset ${offset} — stopping this category`)
      break
    }
    const json: any = await res.json()
    const items: RawItem[] = json?.result?.items ?? []
    total = json?.result?.pagination?.total ?? json?.result?.total ?? items.length

    if (dumpFirst && all.length === 0 && items[0]) {
      console.log('\n── First raw item (for field verification) ──')
      console.log(JSON.stringify(items[0], null, 2).slice(0, 1500))
      console.log('──────────────────────────────────────────\n')
    }

    if (items.length === 0) break
    all.push(...items)
    process.stdout.write(`  fetched ${all.length}/${total}\r`)
    offset += PAGE_SIZE
  }
  process.stdout.write('\n')
  return all
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Uniqlo scraper → CSV')
  console.log('====================\n')

  const seen = new Set<string>()
  const rows: ReturnType<typeof mapRow>[] = []

  for (let i = 0; i < CATEGORY_URLS.length; i++) {
    console.log(`Category ${i + 1}/${CATEGORY_URLS.length}`)
    const items = await fetchCategory(CATEGORY_URLS[i], i === 0)
    for (const item of items) {
      const row = mapRow(item)
      if (!row.name || !row.image_url || !row.product_url) continue
      if (seen.has(row.product_url)) continue
      seen.add(row.product_url)
      rows.push(row)
    }
  }

  const header = ['name', 'brand', 'category', 'price', 'currency', 'image_url', 'product_url', 'color']
  const lines = [
    header.join(','),
    ...rows.map(r => header.map(h => csvCell((r as Record<string, unknown>)[h])).join(',')),
  ]
  fs.writeFileSync(OUTPUT, lines.join('\n'))

  console.log(`\nDone. ${rows.length} unique products → ${OUTPUT}`)
  console.log(`Next:  npm run ingest-feed -- scripts/uniqlo-feed.csv`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
