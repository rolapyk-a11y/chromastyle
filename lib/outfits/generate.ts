// Outfit suggestions without AI: tries the combinations in the closet, drops anything that
// breaks the user's rules, scores the rest on colours, occasion and fit, and picks three
// that differ from each other and from outfits he already has. Free, instant, works offline.

import type { Outfit, Piece } from '@/lib/types'
import { seasonFit } from '@/lib/closet/colors'
import { checkOutfit } from '@/lib/outfits/rules'
import { sortPieces } from '@/lib/outfits/pieces'

export interface RuleSuggestion {
  name: string
  why: string
  styling_tip: string
  missing: string | null
  pieces: Piece[]
}

const isTee = (p: Piece) => /t-shirt|tee\b/i.test(`${p.name} ${p.subcategory ?? ''}`)
const isSport = (p: Piece) => /sport|træning|cykel/i.test(`${p.name} ${p.subcategory ?? ''} ${p.style_tags.join(' ')}`)
const COLD = /kold|vinter|frost|regn|udendørs|ude/i

export function generateOutfits(opts: {
  occasion: string
  wish?: string | null
  pieces: Piece[]
  existing: Outfit[]
  best: string[]
  avoid: string[]
  count?: number
}): RuleSuggestion[] {
  const usable = opts.pieces.filter((p) => !isSport(p))
  const by = (c: Piece['category']) => usable.filter((p) => p.category === c)
  const tees = by('top').filter(isTee)
  const layers = by('top').filter((p) => !isTee(p))
  const bottoms = by('bottom')
  const shoes = by('shoes')
  const outers = by('outerwear')
  if (!tees.length && !layers.length) return []

  const wantsJacket = opts.occasion === 'outdoor' || COLD.test(opts.wish ?? '')
  const tops: Piece[][] = [
    ...tees.map((t) => [t]),
    ...layers.flatMap((l) => tees.map((t) => [l, t])),
  ]
  const outerOptions: (Piece | null)[] = wantsJacket && outers.length ? outers : [null, ...outers]

  const existingKeys = new Set(opts.existing.map((o) => o.pieces.map((p) => p.key).sort().join('|')))
  const scored: { pieces: Piece[]; score: number }[] = []

  for (const top of tops)
    for (const bottom of bottoms.length ? bottoms : [null])
      for (const shoe of shoes.length ? shoes : [null])
        for (const outer of outerOptions) {
          const pieces = sortPieces([...top, bottom, shoe, outer].filter((p): p is Piece => !!p))
          if (existingKeys.has(pieces.map((p) => p.key).sort().join('|'))) continue
          const checks = checkOutfit(pieces, opts.best, opts.avoid)
          if (checks.some((c) => c.level === 'warn')) continue

          let score = 10 - checks.filter((c) => c.level === 'tip').length * 3
          // Light, warm colour right at the face is what lifts him most
          const face = outer ?? top[0]
          const fit = seasonFit(face.colors, opts.best, opts.avoid)
          score += fit === 'great' ? 3 : fit === 'avoid' ? -3 : 0
          // Items tagged for this occasion
          score += pieces.filter((p) => p.occasions?.includes(opts.occasion)).length
          // A layer reads more put-together than a lone tee, except in warm weather
          if (top.length > 1) score += 1
          if (wantsJacket && outer) score += 2
          scored.push({ pieces, score })
        }

  scored.sort((a, b) => b.score - a.score)

  // Pick varied outfits: each new one must change at least two pieces
  const picked: Piece[][] = []
  for (const s of scored) {
    const keys = new Set(s.pieces.map((p) => p.key))
    const tooClose = picked.some((p) => p.filter((x) => keys.has(x.key)).length >= s.pieces.length - 1)
    if (!tooClose) picked.push(s.pieces)
    if (picked.length === (opts.count ?? 3)) break
  }

  return picked.map((pieces) => describe(pieces, opts.best, opts.avoid))
}

function describe(pieces: Piece[], best: string[], avoid: string[]): RuleSuggestion {
  const top = pieces.find((p) => p.category === 'top' && !isTee(p)) ?? pieces.find((p) => p.category === 'top')
  const outer = pieces.find((p) => p.category === 'outerwear')
  const bottom = pieces.find((p) => p.category === 'bottom')
  const tee = pieces.find(isTee)
  const face = outer ?? top
  const name = [outer?.name ?? top?.name, bottom?.name].filter(Boolean).join(' og ')

  const why: string[] = ['Følger dine regler.']
  if (face && seasonFit(face.colors, best, avoid) === 'great') why.push(`${face.name} er en af dine farver tæt på ansigtet.`)
  if (bottom) why.push(`${bottom.name} giver en rolig bund.`)

  const tip =
    top && tee && top !== tee
      ? `Lad ${tee.name.toLowerCase()} kigge en smule frem i halsen.`
      : 'Hold bukserne så de kun lige knækker ved skoen.'

  return { name: name || 'Forslag', why: why.join(' '), styling_tip: tip, missing: null, pieces }
}
