/**
 * Body Guide
 *
 * Self-reported body proportions → concrete cut/silhouette recommendations.
 *
 * The fit rules follow what menswear fit guides agree on (reviewed 2026-11):
 * - Wider hips ("pear"/triangle build): straight or relaxed-straight trousers that fall
 *   straight from the widest part of the hip; mid rise; plain fronts. Skinny, slim and
 *   strongly tapered legs highlight the hips. Very wide/baggy legs add volume and, under
 *   ~1.78 m, shorten the leg. (The Vou, Sartoro, The Rake, Real Men Real Style)
 * - Shorter legs / longer torso: mid rise (not low, not ultra-high), no or slight break,
 *   a clean line to the ankle, and a front tuck so the torso doesn't look longer.
 *   (Gentleman's Gazette, Mr Porter, Proper Cloth, The Modest Man)
 * - Relaxed is not oversized: generous where it counts with structure kept – if the
 *   trousers are roomy, the top needs some shape. (Real Men Real Style, Man of Many)
 * - 2026: straight / relaxed-straight is the mainstream default; slim has lost that role.
 *   (Mr Porter, COS fit guide, Ape to Gentleman)
 */
import type {
  BodyProfile,
  GarmentCut,
  ItemCategory,
  HeightBand,
  ShoulderBuild,
  BodyProportion,
  BuildType,
  HipWidth,
} from './types'

// ─── Quiz definition ──────────────────────────────────────────────────────────

export interface BodyQuestionOption<V extends string> {
  value: V
  label: string
  sublabel: string
}

export interface BodyQuestion<V extends string> {
  field: keyof Omit<BodyProfile, 'created_at'>
  question: string
  hint: string
  options: BodyQuestionOption<V>[]
}

export const HEIGHT_QUESTION: BodyQuestion<HeightBand> = {
  field: 'height',
  question: 'Hvor høj er du?',
  hint: 'Cirka – det skalerer silhuetterne til din krop.',
  options: [
    { value: 'short',   label: 'Under 1,72 m',  sublabel: 'Lavere' },
    { value: 'average', label: '1,72 – 1,83 m', sublabel: 'Gennemsnitlig højde' },
    { value: 'tall',    label: 'Over 1,83 m',   sublabel: 'Høj' },
  ],
}

export const SHOULDER_QUESTION: BodyQuestion<ShoulderBuild> = {
  field: 'shoulders',
  question: 'Hvordan er dine skuldre?',
  hint: 'Stå afslappet foran et spejl.',
  options: [
    { value: 'narrow',  label: 'Smalle',     sublabel: 'Skuldrene virker smalle' },
    { value: 'average', label: 'Almindelige', sublabel: 'Hverken smalle eller brede' },
    { value: 'broad',   label: 'Brede',      sublabel: 'Tydeligt brede skuldre' },
  ],
}

export const HIPS_QUESTION: BodyQuestion<HipWidth> = {
  field: 'hips',
  question: 'Hvordan er dine hofter i forhold til skuldrene?',
  hint: 'Det afgør især, hvilke bukser der klæder dig.',
  options: [
    { value: 'narrow',  label: 'Smallere',   sublabel: 'Hofterne er smallere end skuldrene' },
    { value: 'average', label: 'Lige brede', sublabel: 'Hofter og skuldre er nogenlunde lige brede' },
    { value: 'wide',    label: 'Bredere',    sublabel: 'Hofterne er brede i forhold til skuldrene' },
  ],
}

export const PROPORTION_QUESTION: BodyQuestion<BodyProportion> = {
  field: 'proportion',
  question: 'Hvordan er dine proportioner?',
  hint: 'Sid på en stol: er det meste af din højde i overkroppen eller i benene?',
  options: [
    { value: 'long-torso', label: 'Lang overkrop', sublabel: 'Kortere ben i forhold til kroppen' },
    { value: 'balanced',   label: 'Afbalanceret',  sublabel: 'Overkrop og ben er nogenlunde lige lange' },
    { value: 'long-legs',  label: 'Lange ben',     sublabel: 'Kortere overkrop i forhold til kroppen' },
  ],
}

export const BUILD_QUESTION: BodyQuestion<BuildType> = {
  field: 'build',
  question: 'Hvad beskriver bedst din bygning?',
  hint: 'Det justerer, hvor tætsiddende eller afslappet vi foreslår.',
  options: [
    { value: 'slim',     label: 'Slank',      sublabel: 'Slank hele vejen' },
    { value: 'average',  label: 'Almindelig', sublabel: 'Hverken slank eller kraftig' },
    { value: 'athletic', label: 'Atletisk',   sublabel: 'Muskuløs, V-form' },
    { value: 'fuller',   label: 'Kraftig',    sublabel: 'Lidt mere omkring maven' },
  ],
}

export const BODY_QUESTIONS = [
  HEIGHT_QUESTION,
  SHOULDER_QUESTION,
  HIPS_QUESTION,
  PROPORTION_QUESTION,
  BUILD_QUESTION,
] as const

// ─── Cut detection from product names ─────────────────────────────────────────

export function inferCutFromName(name: string): GarmentCut {
  const n = name.toLowerCase()
  if (/\boversized\b/.test(n)) return 'oversized'
  if (/\bwide[- ]?leg\b|\bwide\b|\bbaggy\b|\bvide ben\b/.test(n)) return 'wide'
  if (/\bloose\b|\brelaxed\b|\bløs\b|\bafslappet\b/.test(n)) return 'relaxed'
  if (/\bskinny\b|\bslim\b|\bslh?slim|\bmuscle\b|\btætsiddende\b/.test(n)) return 'slim'
  if (/\btapered\b|\bcarrot\b/.test(n)) return 'tapered'
  if (/\bregular\b|\bstraight\b|\bclassic\b|\blige ben\b/.test(n)) return 'regular'
  return 'regular'
}

/** True when the product name names its cut (so absence of a hint isn't treated as "regular"). */
export function nameMentionsCut(name: string): boolean {
  return /\b(oversized|wide|baggy|loose|relaxed|skinny|slim|muscle|tapered|carrot|regular|straight|classic)\b|slh?slim/i.test(name)
}

// Numeric "looseness" of each cut, 1 (tightest) → 6 (loosest)
const CUT_LOOSENESS: Record<GarmentCut, number> = {
  slim: 1, tapered: 2, regular: 3, relaxed: 4, wide: 5, oversized: 6,
}

// ─── Body-fit scoring ─────────────────────────────────────────────────────────

export function cutFitsBody(
  cut: GarmentCut,
  category: ItemCategory,
  profile: BodyProfile,
): { delta: number; reason: string } {
  const loose = CUT_LOOSENESS[cut]
  let delta = 0
  const reasons: string[] = []
  const isBottom = category === 'bottom'
  const isTop = category === 'top' || category === 'jacket'
  const wideHips = profile.hips === 'wide'

  // ── Hips: the strongest signal for trousers ──
  if (wideHips) {
    if (isBottom && loose <= 2) { delta -= 12; reasons.push('slim og tilspidsede ben fremhæver brede hofter') }
    if (isBottom && (loose === 3 || loose === 4)) { delta += 8; reasons.push('lige og relaxed ben falder rent fra hoften') }
    if (isBottom && loose >= 6) { delta -= 6; reasons.push('meget vide bukser lægger volumen på hofterne') }
    if (isTop && loose <= 1) { delta -= 8; reasons.push('stramme overdele over brede hofter forstærker ubalancen') }
    if (isTop && (loose === 3 || loose === 4)) { delta += 3; reasons.push('en afslappet overdel med lidt struktur balancerer hofterne') }
    if (isTop && loose >= 6) { delta -= 4; reasons.push('oversized overdele gør silhuetten firkantet') }
  } else if (profile.hips === 'narrow') {
    if (isBottom && loose <= 2) { delta += 3; reasons.push('smalle hofter kan bære slanke ben') }
  }

  // ── Height ──
  if (profile.height === 'short') {
    if (loose >= 5) { delta -= 10; reasons.push('vide og oversized snit gør en lavere krop mindre') }
    else if (loose <= 2 && !wideHips) { delta += 4; reasons.push('rene linjer forlænger en lavere krop') }
  } else if (profile.height === 'average') {
    if (isBottom && loose >= 5) { delta -= 4; reasons.push('helt vide ben kan skære benene over under ca. 1,78 m') }
  } else if (profile.height === 'tall') {
    if (loose >= 4) { delta += 5; reasons.push('din højde bærer afslappet volumen godt') }
  }

  // ── Shoulders ──
  if (profile.shoulders === 'broad') {
    if (isTop && loose >= 5) { delta -= 8; reasons.push('oversized overdele overdriver brede skuldre') }
    if (isBottom && loose >= 5) { delta -= 4; reasons.push('vide bukser gør en bred overkrop tung') }
  } else if (profile.shoulders === 'narrow') {
    if (isTop && (loose === 3 || loose === 4)) { delta += 5; reasons.push('lidt struktur foroven bygger smalle skuldre op') }
    if (isTop && loose <= 1) { delta -= 3; reasons.push('meget slanke overdele fremhæver smalle skuldre') }
  }

  // ── Proportion ──
  if (profile.proportion === 'long-torso') {
    if (isBottom && loose >= 5) { delta -= 4; reasons.push('vide ben forkorter et kortere benparti') }
    if (isBottom && (loose === 3 || loose === 4)) { delta += 2; reasons.push('en ren, lige benlinje forlænger benene') }
  } else if (profile.proportion === 'long-legs') {
    if (isBottom && loose >= 4) { delta += 3; reasons.push('lange ben bærer vide og afslappede bukser godt') }
  }

  // ── Build ──
  if (profile.build === 'slim') {
    if (loose >= 6) { delta -= 5; reasons.push('oversized drukner en slank krop') }
  } else if (profile.build === 'athletic') {
    if (isTop && loose <= 2) { delta += 3; reasons.push('tætte overdele viser en atletisk overkrop') }
    if (loose >= 6) { delta -= 4; reasons.push('oversized skjuler en atletisk krop') }
  } else if (profile.build === 'fuller') {
    if (loose <= 1) { delta -= 6; reasons.push('meget slanke snit klæber på en kraftig krop') }
    if (loose >= 6) { delta -= 5; reasons.push('oversized lægger volumen på en kraftig krop') }
    if (loose === 3 || loose === 4) { delta += 5; reasons.push('regular og relaxed snit falder pænt på en kraftig krop') }
  }

  delta = Math.max(-16, Math.min(12, delta))
  return { delta, reason: reasons[0] ?? '' }
}

// ─── Plain-language fit tips for the whole profile ────────────────────────────

export function fitTipsFor(profile: BodyProfile): string[] {
  const tips: string[] = []

  if (profile.hips === 'wide') {
    tips.push('Vælg lige eller relaxed-straight bukser, der falder lige ned fra hoften. Undgå slim, skinny og stærkt tilspidsede ben.')
    tips.push('Mellemhøj talje og glat front. Hold lommer og detaljer væk fra hofterne.')
    tips.push('Struktur foroven: krave, overshirt eller half-zip giver skuldrene vægt, så hofterne balanceres.')
  }
  if (profile.proportion === 'long-torso') {
    tips.push('Lad bukserne kun lige røre skoen – intet eller et lille knæk. Fulde knæk gør benene kortere.')
    tips.push('Front-tuck t-shirten eller vælg overdele, der slutter ved hoftebenet, så overkroppen ikke ser længere ud.')
    tips.push('Bukser og sko i samme lyshed forlænger benene.')
  } else if (profile.proportion === 'long-legs') {
    tips.push('Din overkrop er den korte del – lad overdele hænge løst og vælg mellemhøj talje.')
  }
  if (profile.height === 'short') {
    tips.push('Én farvefamilie fra skulder til sko får en lavere krop til at se højere ud.')
  } else if (profile.height === 'average' && profile.hips === 'wide') {
    tips.push('Relaxed er din sweet spot. Helt vide ben (baggy/skater) er for meget i din højde.')
  } else if (profile.height === 'tall') {
    tips.push('Du kan bære afslappede og vide snit. Skift farve ved taljen, så du ikke ser strakt ud.')
  }
  if (profile.shoulders === 'broad') {
    tips.push('Balancér brede skuldre med rene, lige bukser – hold volumen væk fra underdelen.')
  } else if (profile.shoulders === 'narrow' && profile.hips !== 'wide') {
    tips.push('Byg skuldrene op med lidt struktur – en overshirt eller en jakke med markerede skuldre.')
  }
  if (profile.build === 'fuller') {
    tips.push('Hverken stramt eller oversized – regular og relaxed i stoffer med fylde falder pænest.')
  }
  tips.push('Relaxed er ikke oversized: er bukserne rummelige, skal overdelen have lidt form.')
  return tips
}

export function bodyProfileSummary(p: BodyProfile): string {
  const h = { short: 'Lavere', average: 'Gennemsnitlig højde', tall: 'Høj' }[p.height]
  const hips = p.hips === 'wide' ? 'brede hofter' : p.hips === 'narrow' ? 'smalle hofter' : null
  const prop = p.proportion === 'long-torso' ? 'kortere ben' : p.proportion === 'long-legs' ? 'lange ben' : null
  const b = { slim: 'slank', average: 'almindelig bygning', athletic: 'atletisk', fuller: 'kraftig' }[p.build]
  return [h, hips, prop, b].filter(Boolean).join(', ')
}

// ─── Storage (guest / localStorage) ───────────────────────────────────────────

const LS_KEY = 'chromastyle_body_profile'

export function loadBodyProfile(): BodyProfile | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as BodyProfile) : undefined
  } catch {
    return undefined
  }
}

export function saveBodyProfile(profile: BodyProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, JSON.stringify(profile))
}
