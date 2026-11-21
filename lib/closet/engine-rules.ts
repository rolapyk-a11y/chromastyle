// Bridges the outfit engine (UserWardrobeItem) and the user's own rules (lib/outfits/rules.ts),
// so the engine's ranked outfits never break them.

import type { Piece, UserWardrobeItem } from '@/lib/types'
import { checkOutfit } from '@/lib/outfits/rules'

const THICK = /sweat|half-zip|halfzip|hoodie|strik|trøje|cardigan|knit/i
const TEE = /t-shirt|tee\b|tanktop/i

function text(i: UserWardrobeItem) {
  return `${i.name} ${i.color_name}`
}

function lightness(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  if (Number.isNaN(n)) return 0
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114
}

export function wardrobeToPiece(i: UserWardrobeItem): Piece {
  return {
    key: `closet:${i.id}`,
    source: 'closet',
    id: i.id,
    name: i.name,
    category: i.category === 'jacket' ? 'outerwear' : i.category,
    subcategory: i.color_name,
    brand: i.brand ?? null,
    colors: [i.color_hex],
    style_tags: [],
    notes: null,
    image_url: i.image_url ?? null,
  }
}

/** A thick knit is always worn over a tee: add the lightest tee the user owns. */
export function withLayerTee(items: UserWardrobeItem[], all: UserWardrobeItem[]): UserWardrobeItem[] {
  const thick = items.some((i) => i.category === 'top' && THICK.test(text(i)))
  if (!thick || items.some((i) => TEE.test(text(i)))) return items
  const tee = all
    .filter((i) => i.category === 'top' && TEE.test(text(i)))
    .sort((a, b) => lightness(b.color_hex) - lightness(a.color_hex))[0]
  return tee ? [...items, tee] : items
}

/** Veto for generateOutfits: true when the outfit (with its tee) breaks none of the user's rules. */
export function rulesVeto(all: UserWardrobeItem[], best: string[] = [], avoid: string[] = []) {
  return (items: UserWardrobeItem[]) =>
    !checkOutfit(withLayerTee(items, all).map(wardrobeToPiece), best, avoid).some((c) => c.level === 'warn')
}
