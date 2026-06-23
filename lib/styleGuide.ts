/**
 * Style Guide
 *
 * Rules and knowledge extracted from analysis of 35+ menswear reference images
 * covering casual, smart casual, street, resort, and summer styles. Used by the
 * outfit engine to generate better tips and bonus scoring for proven colour
 * combinations and fabric/texture pairings.
 */

import type { FabricWeight, Season } from './types'

// ─── Proven colour pair combinations ─────────────────────────────────────────
// Each entry describes a combination that appears repeatedly across style guides.
// bonus: added to pairScore when matched. tip: shown in the outfit card.

export interface StylePair {
  name: string
  families: [ColourFamily, ColourFamily]
  bonus: number
  tip: string
}

export type ColourFamily =
  | 'white' | 'cream' | 'beige' | 'sand'
  | 'black' | 'charcoal' | 'grey'
  | 'navy' | 'blue'
  | 'brown' | 'camel' | 'tan'
  | 'olive' | 'khaki'
  | 'sage' | 'green'
  | 'burgundy' | 'warm-red'

export const PROVEN_PAIRS: StylePair[] = [
  // ── Neutral anchors ──
  { name: 'White + Navy',    families: ['white',  'navy'],    bonus: 15, tip: 'White + navy — the cleanest classic combination. Effortless and always right.' },
  { name: 'Black + Beige',   families: ['black',  'beige'],   bonus: 15, tip: 'Black + beige — high contrast with a neutral base. Wear with white sneakers.' },
  { name: 'Black + Cream',   families: ['black',  'cream'],   bonus: 14, tip: 'Black + cream — softer than black/white but just as sharp. Very wearable.' },
  { name: 'Grey + White',    families: ['grey',   'white'],   bonus: 12, tip: 'Grey + white — minimal and effortless. Let fit and texture do the talking.' },
  { name: 'Charcoal + White',families: ['charcoal','white'],  bonus: 12, tip: 'Charcoal + white — strong value contrast. One of the most reliable combos.' },
  { name: 'Camel + Black',   families: ['camel',  'black'],   bonus: 14, tip: 'Camel + black — premium contrast. Add white sneakers or brown leather shoes.' },
  { name: 'Camel + White',   families: ['camel',  'white'],   bonus: 12, tip: 'Camel + white — warm and light. Great for spring/autumn.' },
  // ── Earth tones ──
  { name: 'Brown + Cream',   families: ['brown',  'cream'],   bonus: 13, tip: 'Brown + cream — warm tones together always look intentional and grounded.' },
  { name: 'Brown + Beige',   families: ['brown',  'beige'],   bonus: 11, tip: 'Brown + beige — tonal earth dressing. Add a white tee for separation.' },
  { name: 'Tan + Navy',      families: ['tan',    'navy'],    bonus: 12, tip: 'Tan + navy — warm base, cool top. One of the most wearable mixed combos.' },
  // ── Greens ──
  { name: 'Olive + Beige',   families: ['olive',  'beige'],   bonus: 13, tip: 'Olive + beige — earth tones that always pair naturally. Very versatile.' },
  { name: 'Olive + Khaki',   families: ['olive',  'khaki'],   bonus: 10, tip: 'Olive + khaki — tonal green-earth combination. Keep shoes minimal.' },
  { name: 'Sage + Black',    families: ['sage',   'black'],   bonus: 12, tip: 'Sage green + black — nature tone on dark base. Very popular for good reason.' },
  { name: 'Sage + Beige',    families: ['sage',   'beige'],   bonus: 11, tip: 'Sage + beige — soft, nature-inspired. Works especially well for spring.' },
  // ── Blues ──
  { name: 'Navy + Grey',     families: ['navy',   'grey'],    bonus: 11, tip: 'Navy + grey — cool tones that complement without competing.' },
  { name: 'Navy + Beige',    families: ['navy',   'beige'],   bonus: 12, tip: 'Navy + beige — classic preppy combination. Hard to get wrong.' },
  { name: 'Blue + White',    families: ['blue',   'white'],   bonus: 13, tip: 'Blue + white — the eternal combination. Clean, fresh, works all seasons.' },
  // ── Accent tones ──
  { name: 'Burgundy + Black',families: ['burgundy','black'],  bonus: 10, tip: 'Burgundy + black — bold but grounded. Great for autumn/winter.' },
  { name: 'Burgundy + Grey', families: ['burgundy','grey'],   bonus: 9,  tip: 'Burgundy + grey — rich accent on a neutral base.' },
  // ── Summer combos (from reference image set 3) ──
  { name: 'White + Beige',    families: ['white',    'beige'],    bonus: 12, tip: 'White + beige — the most wearable summer formula. Linen versions of both look effortlessly good.' },
  { name: 'Black + Khaki',   families: ['black',    'khaki'],    bonus: 11, tip: 'Black + khaki — easy to copy, always sharp. White sneakers seal the look.' },
  { name: 'Green + Navy',    families: ['green',    'navy'],     bonus: 10, tip: 'Green + navy — warm tone meets cool base. Keep one piece solid, one textured.' },
  { name: 'Blue + Grey',     families: ['blue',     'grey'],     bonus: 10, tip: 'Blue + grey — effortless pairing that rarely goes wrong. Easy casual summer go-to.' },
  { name: 'Sage + Charcoal', families: ['sage',     'charcoal'], bonus: 11, tip: 'Sage + charcoal — soft nature tone on a strong dark base. Modern and wearable.' },
  { name: 'Olive + Cream',   families: ['olive',    'cream'],    bonus: 12, tip: 'Olive + cream — the linen summer pairing. Relaxed, natural, works with sandals or white sneakers.' },
  { name: 'Warm-red + White',families: ['warm-red', 'white'],    bonus: 10, tip: 'Terracotta / rust + white — bold warm accent on a clean base. A strong summer statement.' },
  // ── Extended neutrals (from reference image set 2) ──
  { name: 'Charcoal + Beige',families: ['charcoal','beige'],  bonus: 11, tip: 'Charcoal + beige — dark neutral on a warm light base. A sharper take on grey + beige.' },
  { name: 'Blue + Cream',    families: ['blue',   'cream'],   bonus: 11, tip: 'Blue + cream — the effortless casual pairing. Works from denim and a knit to linen in summer.' },
  { name: 'Blue + Beige',    families: ['blue',   'beige'],   bonus: 10, tip: 'Light blue + beige (taupe) — airy and easy. Ideal for warm weather and resort looks.' },
  // ── Earth tones extended ──
  { name: 'Camel + Brown',   families: ['camel',  'brown'],   bonus: 9,  tip: 'Camel + brown — warm tonal earth dressing. Vary textures (knit vs woven) for separation.' },
  // ── Greens extended ──
  { name: 'Green + Black',   families: ['green',  'black'],   bonus: 11, tip: 'Dark green + black — nature tone anchored by black. On-trend and effortless.' },
  { name: 'Green + Beige',   families: ['green',  'beige'],   bonus: 10, tip: 'Green + beige — earthy and natural. The overshirt-over-tee formula in its best colours.' },
  // ── "Old Money" combinations (from reference image set 4) ──
  // Navy + camel is the single most repeated pairing across all Old Money guides.
  { name: 'Navy + Camel',     families: ['navy',     'camel'],    bonus: 14, tip: 'Navy + camel — the Old Money staple. Sharp contrast, warm base. Brown leather shoes complete it.' },
  { name: 'Cream + Navy',     families: ['cream',    'navy'],     bonus: 12, tip: 'Cream + navy — warm-cool contrast at its cleanest. Works in linen for summer or cotton for autumn.' },
  { name: 'Blue + Camel',     families: ['blue',     'camel'],    bonus: 11, tip: 'Light blue + camel — airy and polished. One of the most copied Old Money combinations.' },
  { name: 'Burgundy + Beige', families: ['burgundy', 'beige'],   bonus: 10, tip: 'Burgundy + beige — rich accent on a warm neutral base. Strong for autumn and smart-casual.' },
  { name: 'Burgundy + Camel', families: ['burgundy', 'camel'],   bonus: 9,  tip: 'Maroon + camel — warm, earthy, sophisticated. A deeper take on burgundy styling.' },
  { name: 'Camel + Beige',    families: ['camel',    'beige'],   bonus: 8,  tip: 'Camel + beige — tonal warm dressing. Vary textures (knit vs woven) to avoid looking flat.' },
  // ── Brown outfit combinations (from Alarna Hope + multiple guides) ──
  { name: 'Charcoal + Brown', families: ['charcoal', 'brown'],   bonus: 10, tip: 'Charcoal + brown (mocha) — deep and warm. The dark anchor + warm tone formula at its best.' },
  { name: 'Brown + Grey',     families: ['brown',    'grey'],    bonus: 9,  tip: 'Brown + grey — warm meets cool neutral. Understated and easy to build on.' },
  { name: 'Brown + Blue',     families: ['brown',    'blue'],    bonus: 10, tip: 'Chocolate brown + blue — unexpected but consistently recommended. Rich contrast that works year-round.' },
  { name: 'Sage + Brown',     families: ['sage',     'brown'],   bonus: 10, tip: 'Sage green + brown — nature pairing. The earthy tone of brown meets the botanical lift of sage.' },
  // ── Shirt & trouser pairings + neutral outfit guide ──
  { name: 'White + Olive',    families: ['white',    'olive'],   bonus: 11, tip: 'White + olive — crisp base with a nature tone. One of the cleanest casual combinations.' },
  { name: 'Olive + Navy',     families: ['olive',    'navy'],    bonus: 10, tip: 'Olive + navy — military meets nautical. Strong and versatile across seasons.' },
  { name: 'Tan + Black',      families: ['tan',      'black'],   bonus: 11, tip: 'Tan + black — light warm tone on the darkest anchor. Sharp, wearable, always sharp.' },
  { name: 'Khaki + Navy',     families: ['khaki',    'navy'],    bonus: 10, tip: 'Khaki + navy — a military-nautical classic. The most reliable two-tone casual formula for warm seasons.' },
]

// ─── Colour family detection from hex ────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let hue = 0
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) hue = ((b - r) / d + 2) / 6
  else hue = ((r - g) / d + 4) / 6
  return [hue * 360, s * 100, l * 100]
}

export function colourFamily(hex: string): ColourFamily {
  const [h, s, l] = hexToHsl(hex)

  // Achromatic (near-white, grey, near-black)
  if (s < 12) {
    if (l > 88) return 'white'
    if (l > 72) return 'cream'
    if (l > 50) return 'grey'
    if (l > 22) return 'charcoal'
    return 'black'
  }

  // Low-saturation warm light tones — beige/cream/sand
  if (s < 30 && l > 65 && h < 60) return 'cream'
  if (s < 35 && l > 50 && h < 60) return 'beige'

  // Hue-based
  if (h < 20 || h >= 345) return 'warm-red'
  if (h < 40)  return l > 55 ? 'tan' : l > 38 ? 'brown' : 'brown'
  if (h < 55)  return l > 55 ? 'sand' : l > 35 ? 'camel' : 'brown'
  if (h < 75)  return l > 55 ? 'khaki' : 'olive'
  if (h < 100) return l < 50 ? 'olive' : 'sage'
  if (h < 160) return 'green'
  if (h < 170) return 'sage'
  if (h < 200) return 'blue'
  if (h < 230) return l < 40 ? 'navy' : 'blue'
  if (h < 270) return 'navy'
  if (h < 300) return 'grey'
  if (h < 330) return 'burgundy'
  return 'warm-red'
}

// Returns the proven pair bonus + tip for two hex colours, or null if no match
export function provenPairBonus(hexA: string, hexB: string): { bonus: number; tip: string } | null {
  const famA = colourFamily(hexA)
  const famB = colourFamily(hexB)
  for (const pair of PROVEN_PAIRS) {
    const [f1, f2] = pair.families
    if ((famA === f1 && famB === f2) || (famA === f2 && famB === f1)) {
      return { bonus: pair.bonus, tip: pair.tip }
    }
  }
  return null
}

// ─── Style archetypes ─────────────────────────────────────────────────────────

export type StyleArchetype = 'minimal' | 'smart-casual' | 'street' | 'resort'

export const ARCHETYPE_DESCRIPTIONS: Record<StyleArchetype, string> = {
  'minimal':      'All neutrals, clean cuts, no logos. Less is more.',
  'smart-casual': 'Elevated basics — trousers over jeans, clean leather shoes, well-fitted.',
  'street':       'Relaxed/oversized silhouettes, monochrome or bold single colour.',
  'resort':       'Linen, light colours, relaxed cuts. Built for warmth.',
}

// ─── Layering formulas ────────────────────────────────────────────────────────

export const LAYERING_FORMULAS = [
  'Open overshirt over a plain tee — the easiest outfit upgrade.',
  'Hoodie under a structured jacket — adds warmth and texture.',
  'Fitted turtleneck under a blazer or coat — smart and clean.',
  'White tee under a dark overshirt with collar visible — adds depth.',
]

// ─── Fit contrast rules ───────────────────────────────────────────────────────
// The single most repeated rule across all 15 reference images:
// ONE relaxed piece + ONE fitted piece = always balanced.

export const FIT_RULES = [
  'Relaxed top + tapered trouser — the most reliable silhouette.',
  'Fitted tee + wide-leg trouser — balanced and modern.',
  'Never two oversized pieces — always anchor with one fitted item.',
  'Crop to ankle on trousers — no fabric pooling at the shoe.',
]

// ─── Shoe pairing rules ───────────────────────────────────────────────────────

export const SHOE_RULES = [
  'White clean sneakers work with every casual combination.',
  'Brown leather/loafers elevate any outfit instantly.',
  'Match shoe depth to trouser: light shoes + light trousers, or dark + dark.',
  'Avoid coloured trainers unless the rest of the outfit is minimal and neutral.',
]

// ─── Fabric & texture ─────────────────────────────────────────────────────────
// Numeric weight 1 (lightest) → 6 (heaviest). Drives season-fit penalties and
// texture contrast bonuses in the outfit engine.

export const FABRIC_WEIGHT: Record<FabricWeight, number> = {
  'linen':        1,
  'light-cotton': 2,
  'cotton':       3,
  'denim':        4,
  'knit':         4,
  'fleece':       5,
  'wool':         6,
}

// Acceptable fabric-weight window [min, max] per season.
// Sourced from 35+ reference images: linen dominates summer, wool/fleece = winter only.
export const SEASON_WEIGHT_IDEAL: Record<Season, [number, number]> = {
  spring: [2, 4],   // light cotton → denim/knit
  summer: [1, 3],   // linen → cotton
  autumn: [3, 5],   // cotton → fleece
  winter: [4, 6],   // denim/knit → wool
}

// Penalty score for a fabric that's too light or too heavy for the season.
export function fabricSeasonPenalty(fabric: FabricWeight, season: Season): number {
  const w = FABRIC_WEIGHT[fabric]
  const [min, max] = SEASON_WEIGHT_IDEAL[season]
  if (w < min) return (min - w) * 8   // too light — e.g. linen in winter
  if (w > max) return (w - max) * 10  // too heavy — e.g. wool coat in summer
  return 0
}

// Texture-contrast bonus when two fabrics pair well together.
// Smooth + textured is the dominant pattern across all reference images.
export function texturePairBonus(
  fabA: FabricWeight,
  fabB: FabricWeight,
): { bonus: number; tip: string } | null {
  const wA = FABRIC_WEIGHT[fabA]
  const wB = FABRIC_WEIGHT[fabB]
  const diff = Math.abs(wA - wB)
  // Matching linen: resort set formula — works when colours are tonal
  if (fabA === 'linen' && fabB === 'linen') {
    return { bonus: 4, tip: 'Two linen pieces — the resort formula. Keep colours tonal or contrast light + colour.' }
  }
  if (diff >= 3) return { bonus: 10, tip: 'Strong texture contrast — the weight difference between these fabrics adds depth and makes the combo feel considered.' }
  if (diff === 2) return { bonus: 6,  tip: 'Smooth meets textured — this is what makes the pairing feel intentional rather than accidental.' }
  if (diff === 1) return { bonus: 3,  tip: 'Subtle texture variation adds quiet depth without drawing attention.' }
  return null
}

// Fabric styling rules extracted from all reference image sets (35+ images)
export const FABRIC_RULES = [
  'Linen is the summer staple — one linen piece makes any outfit feel seasonal and intentional.',
  'Open woven overshirt over a plain tee: the texture contrast is what makes layering look intentional.',
  'Ribbed knit + smooth chino — the texture difference makes both pieces look better.',
  'Matching linen top + bottom in tonal colours = resort dressing. A classic summer move.',
  'Never two heavy-weight pieces at once unless the outer layer stays open.',
  'Denim + cotton tee is the most reliable casual formula across all seasons.',
  'A structured (woven) piece paired with something relaxed (knit, tee) creates the right balance.',
]

// ─── Tips by outfit score ─────────────────────────────────────────────────────
// Used to supplement the engine tip with style-guide-sourced advice.

export const SCORE_TIPS: Record<'great' | 'good' | 'okay' | 'clash', string[]> = {
  great: [
    'Finish with white sneakers or clean brown leather shoes.',
    'This combination appears in nearly every minimal menswear guide.',
    'Add an open overshirt in a neutral tone to layer without breaking the palette.',
  ],
  good: [
    'A white tee as a base layer ties the palette together.',
    'White sneakers will sharpen this combination.',
    'Try tucking the top slightly — it adds intention to the look.',
  ],
  okay: [
    'Add a neutral third piece (beige overshirt, grey jacket) to bridge the colours.',
    'One piece closer to white or cream will lift this combination.',
    'This works better with one fitted and one relaxed piece.',
  ],
  clash: [
    'Try replacing one piece with a neutral — black, white, beige, or grey.',
    'Keep one colour and replace the other with a proven partner.',
    'Monochrome (shades of the same colour) would work better here.',
  ],
}
