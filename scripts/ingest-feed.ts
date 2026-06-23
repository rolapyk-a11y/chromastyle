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

// ─── Colour from name (fallback when image download fails) ───────────────────
// Maps Danish and English colour words in product names to hex values.
// Ordered most-specific first to avoid "navy" matching before "navy blå".
const COLOUR_NAME_MAP: Array<{ pattern: RegExp; hex: string; name: string }> = [
  // Danish
  { pattern: /navy\s*bl[åa]/i,         hex: '#1F3A5F', name: 'Navy Blue' },
  { pattern: /dyb\s*navy/i,            hex: '#1A2E47', name: 'Deep Navy' },
  { pattern: /m[øo]rkegr[åa]/i,        hex: '#4A4A4A', name: 'Dark Grey' },
  { pattern: /heather\s*grey/i,        hex: '#9E9E9E', name: 'Heather Grey' },
  { pattern: /light\s*graphite/i,      hex: '#B0B0B0', name: 'Light Graphite' },
  { pattern: /lys\s*gr[åa]/i,          hex: '#C8C8C8', name: 'Light Grey' },
  { pattern: /dark\s*heather\s*grey/i, hex: '#6E6E6E', name: 'Dark Heather Grey' },
  { pattern: /oliven/i,                hex: '#6B7A3A', name: 'Olive Green' },
  { pattern: /army/i,                  hex: '#4A5240', name: 'Army Green' },
  { pattern: /deep\s*blue/i,           hex: '#1E3A6E', name: 'Deep Blue' },
  { pattern: /vintage\s*navy/i,        hex: '#2B3A6B', name: 'Vintage Navy' },
  { pattern: /natural|natr[uo]al/i,    hex: '#F5F0E8', name: 'Natural' },
  { pattern: /sort\b/i,                hex: '#1C1C1E', name: 'Black' },
  { pattern: /hvid\b/i,                hex: '#F8F8F8', name: 'White' },
  { pattern: /gr[åa]\b/i,              hex: '#9E9E9E', name: 'Grey' },
  { pattern: /bl[åa]\b/i,              hex: '#2A52BE', name: 'Blue' },
  { pattern: /r[øo]d\b/i,              hex: '#C0392B', name: 'Red' },
  { pattern: /gr[øo]n\b/i,             hex: '#4A7C59', name: 'Green' },
  { pattern: /gul\b/i,                 hex: '#F4C430', name: 'Yellow' },
  { pattern: /brun\b/i,                hex: '#7B4F2E', name: 'Brown' },
  { pattern: /beige\b/i,               hex: '#E8DCC8', name: 'Beige' },
  // English
  { pattern: /\bblack\b/i,             hex: '#1C1C1E', name: 'Black' },
  { pattern: /\bwhite\b/i,             hex: '#F8F8F8', name: 'White' },
  { pattern: /\bnavy\b/i,              hex: '#1F3A5F', name: 'Navy' },
  { pattern: /\bgrey\b|\bgray\b/i,     hex: '#9E9E9E', name: 'Grey' },
  { pattern: /\bblue\b/i,              hex: '#2A52BE', name: 'Blue' },
  { pattern: /\bgreen\b/i,             hex: '#4A7C59', name: 'Green' },
  { pattern: /\bred\b/i,               hex: '#C0392B', name: 'Red' },
  { pattern: /\bkhaki\b/i,             hex: '#C3B091', name: 'Khaki' },
  { pattern: /\bolive\b/i,             hex: '#6B7A3A', name: 'Olive' },
  { pattern: /\bcamel\b/i,             hex: '#C19A6B', name: 'Camel' },
  { pattern: /\bbrown\b/i,             hex: '#7B4F2E', name: 'Brown' },
  { pattern: /\bbeige\b/i,             hex: '#E8DCC8', name: 'Beige' },
  { pattern: /\bcream\b/i,             hex: '#FFFDD0', name: 'Cream' },
  { pattern: /\bbordeaux\b|\bburgundy\b/i, hex: '#722F37', name: 'Burgundy' },
  { pattern: /\bpink\b/i,              hex: '#FFB6C1', name: 'Pink' },
  { pattern: /\bpurple\b/i,            hex: '#800080', name: 'Purple' },
  { pattern: /\borange\b/i,            hex: '#E8722A', name: 'Orange' },
  { pattern: /\byellow\b/i,            hex: '#F4C430', name: 'Yellow' },
  { pattern: /\bsand\b/i,              hex: '#D4B896', name: 'Sand' },
  { pattern: /\bstone\b/i,             hex: '#C5B99A', name: 'Stone' },
  { pattern: /\btaupe\b/i,             hex: '#8B8589', name: 'Taupe' },
  { pattern: /\bcharcoal\b/i,          hex: '#36454F', name: 'Charcoal' },
  { pattern: /\brust\b/i,              hex: '#B7410E', name: 'Rust' },
  { pattern: /\bmustard\b/i,           hex: '#FFDB58', name: 'Mustard' },
  { pattern: /\bteal\b/i,              hex: '#008080', name: 'Teal' },
  { pattern: /\bmint\b/i,              hex: '#98FF98', name: 'Mint' },
  { pattern: /\bterracotta\b/i,        hex: '#E2725B', name: 'Terracotta' },
  { pattern: /\bwhine\b|\bwine\b/i,    hex: '#722F37', name: 'Wine' },
  { pattern: /\blavender\b/i,          hex: '#B57EDC', name: 'Lavender' },
  { pattern: /\bcoral\b/i,             hex: '#FF7F7F', name: 'Coral' },
  { pattern: /\bturquoise\b/i,         hex: '#40E0D0', name: 'Turquoise' },
  { pattern: /\bindigo\b/i,            hex: '#4B0082', name: 'Indigo' },
  { pattern: /\bsage\b/i,              hex: '#B2AC88', name: 'Sage' },
  { pattern: /\bforest\b/i,            hex: '#228B22', name: 'Forest Green' },
  { pattern: /\bmauve\b/i,             hex: '#E0B0FF', name: 'Mauve' },
  { pattern: /\bblush\b/i,             hex: '#DE5D83', name: 'Blush' },
  { pattern: /\bbone\b/i,              hex: '#E3DAC9', name: 'Bone' },
  { pattern: /\bocean\b/i,             hex: '#006994', name: 'Ocean Blue' },
  { pattern: /\bwashed\b/i,            hex: '#A8B5C1', name: 'Washed Blue' },
]

function inferColourFromName(name: string): { hex: string; name: string } | null {
  for (const entry of COLOUR_NAME_MAP) {
    if (entry.pattern.test(name)) return { hex: entry.hex, name: entry.name }
  }
  return null
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
    // Partner-ads Danish XML (Nordic Fashion, Dintojmand)
    'vareurl',
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
    // Partner-ads Danish XML
    'billedurl',
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
    // Partner-ads Danish XML
    'produktnavn',
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
    // Zalando Awin
    'brand', 'designer',
    // Partner-ads Danish XML — <forhandler> is the store, <brand> is the clothing brand
    'brand', 'forhandler',
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
    // Partner-ads Danish XML
    'kategorinavn',
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
    // Partner-ads Danish XML — nypris = current price, glpris = original/old price
    'nypris', 'glpris',
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
  const blockRe = /<(?:item|product|produkt)\b[^>]*>([\s\S]*?)<\/(?:item|product|produkt)>/gi
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

  // Read as binary then decode — handles both UTF-8 and ISO-8859-1 (common in Danish feeds)
  const buf = fs.readFileSync(feedPath)
  const rawSniff = buf.slice(0, 200).toString('latin1')
  const encodingMatch = rawSniff.match(/encoding=["']([^"']+)["']/i)
  const declared = encodingMatch?.[1]?.toLowerCase() ?? 'utf-8'
  const raw = (declared === 'iso-8859-1' || declared === 'latin1')
    ? buf.toString('latin1')
    : buf.toString('utf-8')

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

    let hex = await dominantColour(image_url)
    let colourSource = 'image'
    if (!hex) {
      const fromName = inferColourFromName(name)
      if (fromName) {
        hex = fromName.hex
        colourSource = `name:"${fromName.name}"`
      } else {
        failed++
        process.stdout.write('✗ image unreadable, no colour in name\n')
        continue
      }
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
    process.stdout.write(`${hex} [${colourSource}]  ${tags}\n`)

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
