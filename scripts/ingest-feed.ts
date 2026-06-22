/**
 * Product feed ingestion
 *
 * Reads a retailer product feed (CSV or XML), downloads each product image,
 * extracts the garment's actual dominant colour, and writes lib/product-catalog.json.
 * The app then matches these against the user's palette by perceptual colour
 * distance (lib/colorMatch.ts).
 *
 * Usage:
 *   npm run ingest-feed -- path/to/feed.csv
 *   npm run ingest-feed -- path/to/feed.xml        # Adtraction / generic XML
 *   npm run ingest-feed -- path/to/feed.csv --brand hm
 *   npm run ingest-feed -- path/to/feed.csv --brand zalando
 *   npm run ingest-feed -- path/to/feed.csv --brand adtraction
 *
 * Supported column naming conventions (case-insensitive, auto-detected):
 *
 *   Generic / our own:   name, brand, category, price, currency, image_url, product_url
 *   Awin (H&M, Zalando): product_name/aw_product_id, aw_image_url, aw_deep_link,
 *                        search_price, merchant_category, brand_name
 *   Partner-ads:         title, link, image_link, google_product_category, product_type
 *   Adtraction:          name, url, imageurl, category, brand, price, currency
 *   Zalando (Awin DK):   article_number, name, article_url, image_url, selling_price,
 *                        category, brand
 *   H&M (direct/Awin):  ProductName, ProductUrl, ImageUrl, CategoryName, Price,
 *                        CurrencyCode
 *
 * `category` is mapped to one of: top, bottom, jacket, shoes, accessory.
 * `fabric` is auto-detected from the product name.
 * `cut` is auto-detected from the product name (Slim Fit, Wide Leg, Oversized, …).
 */

import fs from 'fs'
import path from 'path'
import { parse as parseCsv } from 'csv-parse/sync'
import { Jimp, intToRGBA } from 'jimp'
import type { ItemCategory, FabricWeight, GarmentCut } from '../lib/types'

const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'product-catalog.json')

// ─── Category normalisation ───────────────────────────────────────────────────

function normaliseCategory(raw: string): ItemCategory {
  const c = raw.toLowerCase()
  if (/(shoe|sneaker|trainer|boot|loafer|footwear|sandal|mule)/.test(c)) return 'shoes'
  if (/(jacket|coat|blazer|hoodie|outerwear|cardigan|parka|anorak|windbreaker)/.test(c)) return 'jacket'
  if (/(trouser|pant|jean|chino|short|bottom|skirt|legging)/.test(c)) return 'bottom'
  if (/(belt|scarf|bag|hat|cap|accessor|sock|tie|glove|beanie|backpack|tote)/.test(c)) return 'accessory'
  if (/(shirt|tee|t-shirt|top|jumper|sweater|knit|polo|blouse|vest|tank|singlet)/.test(c)) return 'top'
  return 'top'
}

// ─── Fabric detection ─────────────────────────────────────────────────────────

function inferFabricFromName(name: string): FabricWeight | undefined {
  const n = name.toLowerCase()
  if (/\blinen\b/.test(n)) return 'linen'
  if (/\bfleece\b/.test(n)) return 'fleece'
  if (/\bwool\b|\bwool(len)?\b|\bcashmere\b|\bmerino\b/.test(n)) return 'wool'
  if (/\bdenim\b|\bjeans?\b|\bjean\b/.test(n)) return 'denim'
  if (/\bknit(ted)?\b|\bknitwear\b|\bjumper\b|\bsweater\b|\bpullover\b/.test(n)) return 'knit'
  // light-cotton before cotton so "cotton t-shirt" matches light-cotton
  if (/\bt[- ]?shirt\b|\btee\b|\bvest\b|\btank\b|\bsingle[t]?\b|\bpolo\b/.test(n)) return 'light-cotton'
  if (/\bcotton\b|\btwill\b|\bchino\b|\boxford\b|\bpoplin\b|\bcanvas\b/.test(n)) return 'cotton'
  return undefined
}

// ─── Cut detection ────────────────────────────────────────────────────────────

function inferCutFromName(name: string): GarmentCut | undefined {
  const n = name.toLowerCase()
  if (/\bover\s?sized\b|\boversize\b/.test(n)) return 'oversized'
  if (/\bwide\s*(leg)?\b|\bwide\s*fit\b/.test(n)) return 'wide'
  if (/\brelaxed\b/.test(n)) return 'relaxed'
  if (/\bslim\s*(fit)?\b/.test(n)) return 'slim'
  if (/\btapered\b/.test(n)) return 'tapered'
  if (/\bregular\s*(fit)?\b|\bclassic\s*fit\b/.test(n)) return 'regular'
  return undefined
}

// ─── Column lookup ────────────────────────────────────────────────────────────

interface FeedRow {
  [key: string]: string
}

function col(row: FeedRow, ...names: string[]): string {
  for (const n of names) {
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === n.toLowerCase())
    if (key && row[key]) return row[key].trim()
  }
  return ''
}

// All known column aliases per logical field — covers generic, Awin, Partner-ads,
// Adtraction, H&M direct, and Zalando Awin feeds.
function getProductUrl(row: FeedRow): string {
  return col(
    row,
    'product_url', 'url', 'link', 'deeplink',
    // Awin
    'aw_deep_link', 'merchant_deep_link',
    // Partner-ads (Google Shopping format)
    'link',
    // H&M
    'producturl', 'product url',
    // Zalando Awin
    'article_url',
    // Adtraction
    'url',
  )
}

function getImageUrl(row: FeedRow): string {
  return col(
    row,
    'image_url', 'image', 'image_link', 'imageurl',
    // Awin
    'aw_image_url', 'merchant_image_url',
    // Partner-ads
    'image_link', 'additional_image_link',
    // H&M
    'imageurl', 'image url', 'productimageurl',
    // Zalando Awin
    'image_url',
    // Adtraction
    'imageurl',
  )
}

function getName(row: FeedRow): string {
  return col(
    row,
    'name', 'title', 'product_name',
    // Awin
    'product_name', 'aw_product_name',
    // Partner-ads / Google Shopping
    'title',
    // H&M
    'productname', 'product name',
    // Zalando Awin
    'name',
    // Adtraction
    'name',
  )
}

function getBrand(row: FeedRow): string {
  return col(
    row,
    'brand', 'merchant',
    // Awin
    'brand_name', 'merchant_name',
    // Partner-ads
    'brand',
    // H&M
    'brand',
    // Zalando Awin — brand is often a separate column
    'brand', 'designer',
  ) || 'Unknown'
}

function getCategory(row: FeedRow): string {
  return col(
    row,
    'category', 'product_type', 'type',
    // Awin
    'merchant_category', 'category_name',
    // Partner-ads / Google Shopping
    'google_product_category', 'product_type',
    // H&M
    'categoryname', 'category name',
    // Zalando Awin
    'category',
    // Adtraction
    'category',
  )
}

function getPrice(row: FeedRow): number {
  const raw = col(
    row,
    'price', 'sale_price',
    // Awin
    'search_price', 'rrp_price',
    // Partner-ads / Google Shopping
    'price', 'sale_price',
    // H&M
    'price', 'saleprice',
    // Zalando Awin
    'selling_price', 'original_price',
    // Adtraction
    'price',
  )
  // Strip currency symbols and spaces, keep only digits and decimal separators
  return parseFloat(raw.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
}

function getCurrency(row: FeedRow): string {
  return col(row, 'currency', 'currency_code', 'currencycode') || 'DKK'
}

// ─── Colour extraction ────────────────────────────────────────────────────────

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => v.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

async function dominantColour(imageUrl: string): Promise<string | null> {
  try {
    const image = await Jimp.read(imageUrl)
    image.resize({ w: 100 })
    const { width, height } = image.bitmap

    const x0 = Math.floor(width * 0.2)
    const x1 = Math.floor(width * 0.8)
    const y0 = Math.floor(height * 0.2)
    const y1 = Math.floor(height * 0.8)

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const { r, g, b, a } = intToRGBA(image.getPixelColor(x, y))
        if (a < 200) continue
        if (r > 235 && g > 235 && b > 235) continue
        if (r < 18 && g < 18 && b < 18) continue
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`
        const cur = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
        cur.count++; cur.r += r; cur.g += g; cur.b += b
        buckets.set(key, cur)
      }
    }

    if (buckets.size === 0) return null

    let best = { count: 0, r: 0, g: 0, b: 0 }
    for (const v of buckets.values()) if (v.count > best.count) best = v

    return toHex(
      Math.round(best.r / best.count),
      Math.round(best.g / best.count),
      Math.round(best.b / best.count),
    )
  } catch {
    return null
  }
}

// ─── XML parsing (Adtraction / generic RSS-style feeds) ───────────────────────

function parseXmlFeed(xml: string): FeedRow[] {
  // Very lightweight: extract all <item> or <product> blocks and pull known tags.
  // Handles the two common structures: RSS-like <item> and <products><product>.
  const rows: FeedRow[] = []
  const blockRe = /<(?:item|product)\b[^>]*>([\s\S]*?)<\/(?:item|product)>/gi
  const tagRe = /<([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g

  let block: RegExpExecArray | null
  while ((block = blockRe.exec(xml)) !== null) {
    const content = block[1]
    const row: FeedRow = {}
    let tag: RegExpExecArray | null
    tagRe.lastIndex = 0
    while ((tag = tagRe.exec(content)) !== null) {
      // Strip XML namespace prefixes (e.g. g:price → price)
      const key = tag[1].replace(/^[a-z]+:/, '')
      row[key] = tag[2].trim()
    }
    if (Object.keys(row).length > 0) rows.push(row)
  }
  return rows
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const feedPath = args[0]
  const brandArgIdx = args.indexOf('--brand')
  const brandArg = brandArgIdx !== -1 ? args[brandArgIdx + 1] : undefined

  if (!feedPath) {
    console.error('Usage: npm run ingest-feed -- path/to/feed.csv [--brand hm|zalando|adtraction]')
    process.exit(1)
  }
  if (!fs.existsSync(feedPath)) {
    console.error(`Feed not found: ${feedPath}`)
    process.exit(1)
  }

  console.log('ChromaStyle — Product Feed Ingestion')
  console.log('====================================\n')
  if (brandArg) console.log(`Brand override: ${brandArg}\n`)

  const raw = fs.readFileSync(feedPath, 'utf-8')
  const ext = path.extname(feedPath).toLowerCase()

  let rows: FeedRow[]
  if (ext === '.xml') {
    rows = parseXmlFeed(raw)
    console.log(`Parsed ${rows.length} products from XML feed\n`)
  } else {
    rows = parseCsv(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as FeedRow[]
    console.log(`Read ${rows.length} rows from CSV feed\n`)
  }

  let existing: Array<Record<string, unknown>> = []
  if (fs.existsSync(OUTPUT_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) } catch { existing = [] }
  }
  const doneUrls = new Set(existing.map(p => p.product_url as string))

  const catalog = [...existing]
  let added = 0, skipped = 0, failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const product_url = getProductUrl(row)
    const image_url = getImageUrl(row)
    const name = getName(row)

    if (!product_url || !image_url || !name) {
      skipped++
      if (i < 3) {
        // Help diagnose column name mismatches on the first few rows
        console.log(`  ⚠ [${i + 1}] Skipping — missing field(s). Keys found: ${Object.keys(row).slice(0, 8).join(', ')}`)
      }
      continue
    }
    if (doneUrls.has(product_url)) { skipped++; continue }

    process.stdout.write(`  [${i + 1}/${rows.length}] ${name.slice(0, 40).padEnd(40)} `)

    const hex = await dominantColour(image_url)
    if (!hex) {
      failed++
      process.stdout.write('✗ image unreadable\n')
      continue
    }

    const fabric = inferFabricFromName(name)
    const cut = inferCutFromName(name)
    const brand = getBrand(row)
    const category = normaliseCategory(getCategory(row) || name)
    const price = getPrice(row)
    const currency = getCurrency(row)

    const entry: Record<string, unknown> = {
      id: `cat-${Date.now()}-${i}`,
      name,
      brand,
      category,
      price,
      currency,
      image_url,
      product_url,
      colorHex: hex,
    }
    if (fabric) entry.fabric = fabric
    if (cut) entry.cut = cut

    catalog.push(entry)
    added++

    const tags = [fabric, cut].filter(Boolean).join('+') || 'colour only'
    process.stdout.write(`${hex}  ${tags}\n`)

    if (added % 25 === 0) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2))
      console.log(`  … ${added} products tagged (progress saved)`)
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2))

  console.log(`\nDone.`)
  console.log(`  Added:   ${added}`)
  console.log(`  Skipped: ${skipped} (missing fields, already ingested, or duplicates)`)
  console.log(`  Failed:  ${failed} (image unreadable)`)
  console.log(`  Catalog: ${catalog.length} total products → ${OUTPUT_PATH}`)

  if (added > 0) {
    const withFabric = catalog.filter(p => (p as Record<string, unknown>).fabric).length
    const withCut = catalog.filter(p => (p as Record<string, unknown>).cut).length
    console.log(`\n  Auto-tagged:`)
    console.log(`    fabric: ${withFabric}/${catalog.length} products`)
    console.log(`    cut:    ${withCut}/${catalog.length} products`)
  }
}

main()
