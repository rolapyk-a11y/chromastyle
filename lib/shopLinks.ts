/**
 * Shop links
 *
 * Turns a wardrobe item's colour + category into a real retailer search URL.
 * We link to the retailer's *search* page (not a specific product) so the link
 * always resolves and shows live, in-stock items in that colour.
 */

import type { ItemCategory } from './types'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// Reduce any hex to a simple, searchable colour word (e.g. "yellow", "navy")
export function hexToColourWord(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2 / 255

  // Greyscale / neutral
  if (max - min < 25) {
    if (lightness > 0.85) return 'white'
    if (lightness < 0.18) return 'black'
    if (lightness > 0.6) return 'light grey'
    return 'grey'
  }

  // Hue in degrees
  const rr = r / 255, gg = g / 255, bb = b / 255
  const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn
  let h = 0
  if (mx === rr) h = ((gg - bb) / d) % 6
  else if (mx === gg) h = (bb - rr) / d + 2
  else h = (rr - gg) / d + 4
  h *= 60
  if (h < 0) h += 360

  // Dark warm tones read as brown
  if (h < 45 && lightness < 0.5) return 'brown'
  if (h < 15 || h >= 345) return 'red'
  if (h < 45) return 'orange'
  if (h < 70) return 'yellow'
  if (h < 165) return 'green'
  if (h < 200) return 'teal'
  if (h < 255) return lightness < 0.35 ? 'navy' : 'blue'
  if (h < 290) return 'purple'
  return 'pink'
}

// Map our category to a garment search word
const CATEGORY_SEARCH_WORD: Record<ItemCategory, string> = {
  top: 'shirt',
  bottom: 'trousers',
  jacket: 'jacket',
  shoes: 'shoes',
  accessory: 'accessories',
}

export interface ShopLink {
  retailer: string
  url: string
}

// Build search links for a colour + category across the app's partner retailers
export function shopLinksFor(colorHex: string, category: ItemCategory): ShopLink[] {
  const colour = hexToColourWord(colorHex)
  const garment = CATEGORY_SEARCH_WORD[category]
  const query = `men ${colour} ${garment}`
  const q = encodeURIComponent(query)

  return [
    { retailer: 'H&M',  url: `https://www2.hm.com/en_us/search-results.html?q=${q}` },
    { retailer: 'Zara', url: `https://www.zara.com/us/en/search?searchTerm=${encodeURIComponent(`${colour} ${garment}`)}&section=MAN` },
  ]
}

// Convenience: a single primary link (H&M)
export function primaryShopLink(colorHex: string, category: ItemCategory): string {
  return shopLinksFor(colorHex, category)[0].url
}
