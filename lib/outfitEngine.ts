/**
 * Outfit Engine
 *
 * Generates and scores outfit combinations from a user's personal wardrobe.
 * Rules are based on warm/cool family, value (lightness) contrast, and
 * season-specific palette compatibility.
 */

import type { UserWardrobeItem, OutfitCombo, SubSeason, ItemCategory, Season } from './types'
import { paletteFor, type PaletteColour } from './palettes'
import { provenPairBonus, SCORE_TIPS, fabricSeasonPenalty, texturePairBonus } from './styleGuide'

// ─── Colour utilities ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// Relative luminance (perceptual lightness 0–100)
function getLightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 2.55
}

// Simple warm/cool classification via the b* axis in Lab space (approximated)
function isWarm(hex: string): boolean {
  const [r, , b] = hexToRgb(hex)
  // Warm colours have more red/green relative to blue
  return r - b > 20
}

function isNeutral(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  // Neutral: low saturation (grey, beige, navy, white, black)
  return max - min < 40
}

// ─── Avoid colours per season family ─────────────────────────────────────────

const SEASON_AVOID: Record<SubSeason, string[]> = {
  'light-spring':  ['cool','black','grey','stark-white'],
  'true-spring':   ['cool','grey','dark-cool'],
  'warm-spring':   ['cool','grey','dark-cool'],
  'light-summer':  ['warm','orange','brown','gold'],
  'true-summer':   ['warm','orange','brown','gold'],
  'soft-summer':   ['vivid','orange','gold'],
  'soft-autumn':   ['cool','vivid-blue','purple'],
  'true-autumn':   ['cool','grey','pastels'],
  'dark-autumn':   ['cool','pastels','light'],
  'dark-winter':   ['warm','orange','brown','gold'],
  'true-winter':   ['warm','beige','orange','brown'],
  'clear-winter':  ['warm','muted','beige'],
}

function colourFitsSeasonAvoid(hex: string, subSeason: SubSeason): boolean {
  const avoid = SEASON_AVOID[subSeason]
  const warm = isWarm(hex)
  const neutral = isNeutral(hex)
  const L = getLightness(hex)

  if (avoid.includes('warm') && warm && !neutral) return false
  if (avoid.includes('cool') && !warm && !neutral) return false
  if (avoid.includes('black') && L < 12) return false
  if (avoid.includes('light') && L > 80) return false
  return true
}

// ─── Pair two items and return a score + tip ──────────────────────────────────

function subSeasonToSeason(sub: SubSeason): Season {
  if (sub.includes('spring')) return 'spring'
  if (sub.includes('summer')) return 'summer'
  if (sub.includes('autumn')) return 'autumn'
  return 'winter'
}

function pairScore(
  a: UserWardrobeItem,
  b: UserWardrobeItem,
  subSeason: SubSeason,
): { score: number; tip: string } {
  const aL = getLightness(a.color_hex)
  const bL = getLightness(b.color_hex)
  const valueDiff = Math.abs(aL - bL)
  const aWarm = isWarm(a.color_hex)
  const bWarm = isWarm(b.color_hex)
  const aNeutral = isNeutral(a.color_hex)
  const bNeutral = isNeutral(b.color_hex)

  // Penalise colours that fight your season
  const aFits = colourFitsSeasonAvoid(a.color_hex, subSeason)
  const bFits = colourFitsSeasonAvoid(b.color_hex, subSeason)
  const seasonPenalty = (!aFits ? 20 : 0) + (!bFits ? 20 : 0)

  // ── Texture modifier (fabric weight vs season + texture contrast) ──────────
  const season = subSeasonToSeason(subSeason)
  let textureDelta = 0
  let textureTip = ''
  if (a.fabric) textureDelta -= fabricSeasonPenalty(a.fabric, season)
  if (b.fabric) textureDelta -= fabricSeasonPenalty(b.fabric, season)
  if (a.fabric && b.fabric) {
    const tb = texturePairBonus(a.fabric, b.fabric)
    if (tb) { textureDelta += tb.bonus; textureTip = ' ' + tb.tip }
  }

  function finalise(rawColourScore: number, tip: string) {
    const combined = Math.max(0, Math.min(100, rawColourScore + textureDelta))
    return { score: combined, tip: tip + textureTip }
  }

  // Check proven style-guide pairs first — gets a bonus + specific tip
  const proven = provenPairBonus(a.color_hex, b.color_hex)
  if (proven) {
    const raw = Math.min(100, 80 + proven.bonus - seasonPenalty)
    return finalise(Math.max(0, raw), proven.tip)
  }

  // One or both are neutral → always works, just needs enough contrast
  if (aNeutral || bNeutral) {
    if (valueDiff > 30) return finalise(Math.max(0, 92 - seasonPenalty), 'Neutral base with clear value contrast — very wearable. ' + SCORE_TIPS.great[0])
    if (valueDiff > 15) return finalise(Math.max(0, 78 - seasonPenalty), 'Neutral pairing. A slightly bigger difference in depth would sharpen it. ' + SCORE_TIPS.good[0])
    return finalise(Math.max(0, 60 - seasonPenalty), 'Both pieces are similar in depth — try one light, one dark. ' + SCORE_TIPS.okay[0])
  }

  // Both in same family (warm+warm or cool+cool)
  if (aWarm === bWarm) {
    if (valueDiff > 35) return finalise(Math.max(0, 88 - seasonPenalty), 'Same colour family, strong value contrast — cohesive and intentional. ' + SCORE_TIPS.great[1])
    if (valueDiff > 20) return finalise(Math.max(0, 73 - seasonPenalty), 'Same family, decent contrast. One piece a shade lighter or darker would perfect it.')
    return finalise(Math.max(0, 45 - seasonPenalty), 'Similar depth and temperature. ' + SCORE_TIPS.okay[2])
  }

  // Mixed warm + cool
  if (bNeutral || aNeutral) {
    return finalise(Math.max(0, 83 - seasonPenalty), 'Statement colour on a neutral base — the most reliable formula. ' + SCORE_TIPS.good[1])
  }
  if (valueDiff > 30) {
    return finalise(Math.max(0, 68 - seasonPenalty), 'Mixed warm/cool with good contrast. Keep shoes and accessories in one family.')
  }
  return finalise(Math.max(0, 50 - seasonPenalty), SCORE_TIPS.clash[0])
}

function scoreLabel(score: number): OutfitCombo['scoreLabel'] {
  if (score >= 85) return 'Great'
  if (score >= 65) return 'Good'
  if (score >= 45) return 'Okay'
  return 'Clash'
}

// ─── Main: generate ranked outfit combos ─────────────────────────────────────

export function generateOutfits(
  items: UserWardrobeItem[],
  subSeason: SubSeason,
): OutfitCombo[] {
  const tops    = items.filter(i => i.category === 'top')
  const bottoms = items.filter(i => i.category === 'bottom')
  const jackets = items.filter(i => i.category === 'jacket')
  const shoes   = items.filter(i => i.category === 'shoes')

  if (tops.length === 0 || bottoms.length === 0) return []

  const combos: OutfitCombo[] = []

  for (const top of tops) {
    for (const bottom of bottoms) {
      const { score: base, tip } = pairScore(top, bottom, subSeason)
      const outfitItems: UserWardrobeItem[] = [top, bottom]

      // Optionally add best-scoring jacket
      let bestJacket: UserWardrobeItem | undefined
      let bestJacketScore = -1
      for (const jacket of jackets) {
        const { score: js } = pairScore(top, jacket, subSeason)
        if (js > bestJacketScore) { bestJacket = jacket; bestJacketScore = js }
      }
      if (bestJacket && bestJacketScore > 60) outfitItems.push(bestJacket)

      // Optionally add best-scoring shoes
      let bestShoes: UserWardrobeItem | undefined
      let bestShoesScore = -1
      for (const shoe of shoes) {
        const { score: ss } = pairScore(bottom, shoe, subSeason)
        if (ss > bestShoesScore) { bestShoes = shoe; bestShoesScore = ss }
      }
      if (bestShoes && bestShoesScore > 60) outfitItems.push(bestShoes)

      const finalScore = Math.round(base * 0.7 + (bestJacketScore > 0 ? bestJacketScore * 0.15 : base * 0.15) + (bestShoesScore > 0 ? bestShoesScore * 0.15 : base * 0.15))

      combos.push({
        items: outfitItems,
        score: Math.min(100, finalScore),
        scoreLabel: scoreLabel(finalScore),
        tip,
      })
    }
  }

  // Sort by score descending, deduplicate similar combos, return top 8
  return combos
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

// ─── "What goes with this?" — style one anchor item ───────────────────────────

// Which categories complete an outfit around a given anchor category
const COMPLEMENT_CATEGORIES: Record<ItemCategory, ItemCategory[]> = {
  top:       ['bottom', 'jacket', 'shoes'],
  bottom:    ['top', 'jacket', 'shoes'],
  jacket:    ['top', 'bottom', 'shoes'],
  shoes:     ['top', 'bottom'],
  accessory: ['top', 'bottom'],
}

// Score an anchor item against a bare palette colour (reuses pairScore)
function pairColourScore(anchor: UserWardrobeItem, hex: string, subSeason: SubSeason): number {
  const pseudo = { color_hex: hex } as UserWardrobeItem
  return pairScore(anchor, pseudo, subSeason).score
}

export interface ColourSuggestion {
  colour: PaletteColour
  score: number
}

export interface AnchorStyleResult {
  partners: Partial<Record<ItemCategory, UserWardrobeItem[]>>            // best matches you already own
  suggestions: Partial<Record<ItemCategory, ColourSuggestion[]>>        // season-correct colours to add
}

/**
 * Build a season-correct outfit around one item the user owns.
 * For each complementary category it returns:
 *  - partners: items already in the wardrobe, ranked by how well they pair
 *  - suggestions: palette colours (season + neutrals) that pair best, so the
 *    user knows exactly which colour to buy if they don't own a match.
 * All suggestions come from the user's palette — never random colours.
 */
export function styleAnchorItem(
  anchor: UserWardrobeItem,
  items: UserWardrobeItem[],
  subSeason: SubSeason,
): AnchorStyleResult {
  const targets = COMPLEMENT_CATEGORIES[anchor.category]
  const palette = paletteFor(subSeason)

  const partners: AnchorStyleResult['partners'] = {}
  const suggestions: AnchorStyleResult['suggestions'] = {}

  for (const cat of targets) {
    // Best partners from the user's own wardrobe
    const owned = items
      .filter(i => i.category === cat && i.id !== anchor.id)
      .map(i => ({ item: i, score: pairScore(anchor, i, subSeason).score }))
      .sort((a, b) => b.score - a.score)
    if (owned.length > 0) partners[cat] = owned.map(o => o.item)

    // Season-correct colours to add for this category
    suggestions[cat] = palette
      .map(colour => ({ colour, score: pairColourScore(anchor, colour.hex, subSeason) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  }

  return { partners, suggestions }
}

// ─── localStorage helpers (guest users) ──────────────────────────────────────

const LS_KEY = 'chromastyle_my_wardrobe'

export function loadLocalWardrobe(): UserWardrobeItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as UserWardrobeItem[]
  } catch {
    return []
  }
}

export function saveLocalWardrobe(items: UserWardrobeItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function addLocalWardrobeItem(item: UserWardrobeItem): void {
  const items = loadLocalWardrobe()
  saveLocalWardrobe([...items, item])
}

export function removeLocalWardrobeItem(id: string): void {
  const items = loadLocalWardrobe()
  saveLocalWardrobe(items.filter(i => i.id !== id))
}
