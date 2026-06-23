/**
 * Product catalog
 *
 * A list of real, buyable products — each tagged with the ACTUAL colour of the
 * garment (extracted from its product image by scripts/ingest-feed.ts).
 * The matching engine (lib/colorMatch.ts) ranks these by closeness to a user's
 * palette colour, so we recommend the right nuance, not just "any yellow".
 *
 * This file is generated. Run `npm run ingest-feed -- <feed.csv>` to (re)build it.
 */

import type { ItemCategory, FabricWeight, GarmentCut, GarmentType } from './types'
import { inferCutFromName } from './bodyGuide'
import catalogData from './product-catalog.json'

export interface CatalogProduct {
  id: string
  name: string
  brand: string
  category: ItemCategory
  price: number
  currency: string
  image_url: string
  product_url: string
  colorHex: string          // the real dominant garment colour, from the image
  colorName?: string
  fabric?: FabricWeight     // fabric weight — used for season-fit scoring
  cut?: GarmentCut          // silhouette — used for body-fit scoring
  garmentType?: GarmentType // fine-grained type — used for "Shop My Colours" filtering
}

// Infer a fine-grained garment type from the product name (and broad category as
// a fallback). Handles English + Danish keywords. Order matters: most specific
// first so "shorts" beats "trousers", "t-shirt" beats "shirt", etc.
export function inferGarmentType(name: string, category: ItemCategory): GarmentType {
  const n = name.toLowerCase()
  if (category === 'shoes' || /\b(shoe|sneaker|trainer|boot|loafer|sandal|sko)\b/.test(n)) return 'shoes'
  if (/\bsocks?\b|\bstr[øo]mpe|\bsok\b/.test(n)) return 'socks'
  if (/\bshorts?\b/.test(n)) return 'shorts'
  if (/\b(trouser|pant|jean|chino|legging|tights?|bukser|sweatbukser|jogg)/.test(n)) return 'trousers'
  if (category === 'jacket' || /\b(jacket|coat|blazer|parka|anorak|jakke|frakke|windbreaker)\b/.test(n)) return 'jacket'
  if (/\b(hoodie|sweatshirt|sweater|jumper|pullover|cardigan|knit|fleece|sweat)\b/.test(n)) return 'sweater'
  if (/\bt[- ]?shirt\b|\btee\b|\btank\b|\bvest\b|baselayer|\bsinglet\b/.test(n)) return 'tshirt'
  if (/\bshirt\b|\bskjorte\b|\bblouse\b|\bpolo\b/.test(n)) return 'shirt'
  // Fall back to the broad category bucket
  if (category === 'bottom') return 'trousers'
  if (category === 'top') return 'tshirt'
  return 'accessory'
}

// Attach a garment cut + garment type to every product (from the JSON if present,
// otherwise inferred from the product name).
export const PRODUCT_CATALOG: CatalogProduct[] = (catalogData as CatalogProduct[]).map(p => ({
  ...p,
  cut: p.cut ?? inferCutFromName(p.name),
  garmentType: p.garmentType ?? inferGarmentType(p.name, p.category),
}))

export function catalogByCategory(category: ItemCategory): CatalogProduct[] {
  return PRODUCT_CATALOG.filter(p => p.category === category)
}

export function catalogIsEmpty(): boolean {
  return PRODUCT_CATALOG.length === 0
}
