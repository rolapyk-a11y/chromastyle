// Steps 2-4: turn a gap into searches, fetch products, then check every product against the
// user's colours, rules and fit before ranking. Product colours are read from the product
// photo by Gemini (free tier); if that fails, the colour named in the title is used.

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import type { Piece } from '@/lib/types'
import { seasonFit, colorDistance } from '@/lib/closet/colors'
import { checkOutfit, type Check } from '@/lib/outfits/rules'
import { sortPieces } from '@/lib/outfits/pieces'
import { colourFromTitle } from '@/lib/shop/colors'
import type { Gap } from '@/lib/shop/gaps'
import { STORES, parsePrice, searchStore, type ShopResult, type ShopStore } from '@/lib/shop/search'

export interface ShopProduct {
  id: string                 // stable id for this result (Google product id or link)
  title: string
  store: string
  link: string
  imageUrl: string
  price: string | null
  priceValue: number | null
  hex: string | null
  colourSource: 'photo' | 'title' | null
  fit: 'good' | 'neutral' | 'poor'
  score: number
  reasons: string[]
  checks: Check[]
  piece: Piece               // the product as an outfit piece (not saved yet)
  outfit: Piece[]            // the outfit with this product in it
}

function lightness(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
}

const GOOD_FIT = /\b(relaxed|loose|wide|straight|regular|afslappet|løs|bred|lige)\b/i
const POOR_FIT = /\b(slim|skinny|muscle|super slim|extra slim|tætsiddende|cropped)\b/i
const TURN_UPS = /\b(opslag|turn-?ups?|cuffed)\b/i
const WRONG_ITEM = /\b(dame|women|kvinde|pige|girl|drenge|børn|kids|baby)\b/i

export async function completeOutfit(opts: {
  supabase: SupabaseClient
  outfit: Piece[]
  gap: Gap
  best: string[]
  avoid: string[]
}): Promise<{ products: ShopProduct[]; searched: string[]; errors: string[] }> {
  const { gap, best, avoid } = opts
  const colour = gap.colours[0]
  const query = [gap.garment, colour?.word].filter(Boolean).join(' ')

  // Step 3: one search per store, in parallel
  const errors: string[] = []
  const perStore = await Promise.all(
    STORES.map(async (store) => {
      try {
        return { store, results: (await searchStore(opts.supabase, store, query)).slice(0, 6) }
      } catch (e) {
        errors.push(`${store.label}: ${e instanceof Error ? e.message : 'fejl'}`)
        return { store, results: [] as ShopResult[] }
      }
    }),
  )
  const candidates = perStore
    .flatMap(({ store, results }) => results.map((r) => ({ store, r })))
    .filter(({ r }) => !WRONG_ITEM.test(r.title))

  // Step 4a: colour of each product
  const photoHex = await coloursFromPhotos(candidates.map((c) => c.r), gap.garment).catch((e) => {
    console.warn('[shop] colour from photos failed:', e instanceof Error ? e.message : e)
    return null
  })

  // Step 4b: put each product into the outfit and score it
  const base = gap.mode === 'replace' ? opts.outfit.filter((p) => p.category !== gap.category) : opts.outfit
  const products = candidates.map(({ store, r }, i) => {
    const titleColour = colourFromTitle(r.title)
    const hex = photoHex?.[i] ?? titleColour?.hex ?? null
    const piece: Piece = {
      key: `shop-new:${r.productId ?? r.link}`,
      source: 'shop',
      id: r.productId ?? r.link,
      name: r.title,
      category: gap.category,
      subcategory: gap.garment,
      brand: store.label,
      colors: hex ? [hex] : [],
      style_tags: [],
      notes: null,
      image_url: r.imageUrl,
      product_url: r.link,
      price: parsePrice(r.price),
    }
    const outfit = sortPieces([...base, piece])
    const checks = checkOutfit(outfit, best, avoid)
    return { store, r, hex, colourSource: (photoHex?.[i] ? 'photo' : titleColour ? 'title' : null) as ShopProduct['colourSource'], piece, outfit, checks }
  })

  const scored: ShopProduct[] = products
    .filter((p) => !p.checks.some((c) => c.level === 'warn'))
    .map((p) => {
      const reasons: string[] = []
      let score = 50

      const fit = p.hex ? seasonFit([p.hex], best, avoid) : 'unknown'
      if (fit === 'great') { score += 20; reasons.push('Klæder dine farver') }
      else if (fit === 'avoid') score -= 30
      else if (fit === 'ok') score += 5

      if (p.hex && colour) {
        const d = colorDistance(p.hex, colour.hex)
        if (d < 60) { score += 15; reasons.push(`Rammer ${colour.word}`) }
        else if (d > 160) score -= 10
      } else if (!p.hex) {
        score -= 10 // colour unknown: can't vouch for it
      }
      // The gap asked for darker shoes: light ones would cut the leg line again
      if (gap.id === 'darker-shoes' && p.hex && lightness(p.hex) > 0.55) score -= 60

      let fitLabel: ShopProduct['fit'] = 'neutral'
      if (POOR_FIT.test(p.r.title)) { score -= 20; fitLabel = 'poor' }
      else if (GOOD_FIT.test(p.r.title)) { score += 8; fitLabel = 'good'; reasons.push('Afslappet pasform') }
      if (gap.category === 'bottom' && TURN_UPS.test(p.r.title)) score -= 10

      const tips = p.checks.filter((c) => c.level === 'tip').length
      score -= tips * 4
      if (!tips) reasons.push('Følger dine regler')
      if (gap.id === 'darker-shoes') reasons.push('Forlænger benene')

      return {
        id: p.piece.id,
        title: p.r.title,
        store: p.store.label,
        link: p.r.link,
        imageUrl: p.r.imageUrl,
        price: p.r.price,
        priceValue: p.piece.price ?? null,
        hex: p.hex,
        colourSource: p.colourSource,
        fit: fitLabel,
        score,
        reasons,
        checks: p.checks,
        piece: p.piece,
        outfit: p.outfit,
      }
    })
    .filter((p) => p.fit !== 'poor' && p.score > 15)
    .sort((a, b) => b.score - a.score)

  // Variety: at most 3 from each store, 6 in total
  const perStoreCount: Record<string, number> = {}
  const picked = scored.filter((p) => {
    perStoreCount[p.store] = (perStoreCount[p.store] ?? 0) + 1
    return perStoreCount[p.store] <= 3
  }).slice(0, 6)

  return { products: picked, searched: STORES.map((s: ShopStore) => `${s.prefix} ${query}`), errors }
}

// ─── Colour from product photos (Gemini, free tier) ─────────────────────────

const PhotoColours = z.object({
  colours: z.array(z.object({ index: z.number(), hex: z.string().nullable() })),
})

async function coloursFromPhotos(results: ShopResult[], garment: string): Promise<(string | null)[] | null> {
  if (!results.length || process.env.MOCK_AI === 'true') return null

  const images = await Promise.all(
    results.map(async (r) => {
      try {
        const res = await fetch(r.imageUrl, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
      } catch {
        return null
      }
    }),
  )

  const content: ({ type: 'text'; text: string } | { type: 'image'; image: Buffer })[] = [
    {
      type: 'text',
      text:
        `Each image shows a product photo of a men's ${garment}. For each image index, give the main colour of the ${garment} ` +
        'itself as a hex code (#RRGGBB), ignoring background, skin and other clothes. Use null if no such garment is visible.',
    },
  ]
  images.forEach((img, i) => {
    if (!img) return
    content.push({ type: 'text', text: `Image ${i}:` })
    content.push({ type: 'image', image: img })
  })
  if (content.length === 1) return null

  const { output } = await generateText({
    model: google('gemini-3.5-flash-lite'),
    output: Output.object({ schema: PhotoColours }),
    messages: [{ role: 'user', content }],
    abortSignal: AbortSignal.timeout(25_000),
  })
  const out: (string | null)[] = results.map(() => null)
  for (const c of output?.colours ?? []) {
    if (c.index >= 0 && c.index < out.length && c.hex && /^#[0-9a-f]{6}$/i.test(c.hex)) out[c.index] = c.hex.toUpperCase()
  }
  return out
}
