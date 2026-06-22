/**
 * Body Guide
 *
 * Self-reported body proportions → concrete cut/silhouette recommendations.
 * The rules below are the menswear fit principles repeated across the reference
 * image sets (balance broad shoulders with tapered bottoms, elongate a short
 * frame with vertical lines, etc.). Photo-based body analysis would need a
 * separate model — five quick self-reported answers give the engine everything
 * it needs without that complexity.
 */

import type {
  BodyProfile,
  GarmentCut,
  ItemCategory,
  HeightBand,
  ShoulderBuild,
  BodyProportion,
  BuildType,
} from './types'

// ─── Quiz definition ──────────────────────────────────────────────────────────
// Drives components/dashboard/body-profile-quiz.tsx. Each question maps to one
// field on BodyProfile.

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
  question: 'How tall are you?',
  hint: 'Roughly — this helps scale silhouettes to your frame.',
  options: [
    { value: 'short',   label: 'Under 1.72 m',  sublabel: 'Shorter frame' },
    { value: 'average', label: '1.72 – 1.83 m',  sublabel: 'Average height' },
    { value: 'tall',    label: 'Over 1.83 m',    sublabel: 'Taller frame' },
  ],
}

export const SHOULDER_QUESTION: BodyQuestion<ShoulderBuild> = {
  field: 'shoulders',
  question: 'How would you describe your shoulders?',
  hint: 'Compared to your hips — stand relaxed in a mirror.',
  options: [
    { value: 'narrow',  label: 'Narrow',  sublabel: 'Shoulders ≈ or narrower than hips' },
    { value: 'average', label: 'Average', sublabel: 'Shoulders roughly balanced with hips' },
    { value: 'broad',   label: 'Broad',   sublabel: 'Shoulders clearly wider than hips' },
  ],
}

export const PROPORTION_QUESTION: BodyQuestion<BodyProportion> = {
  field: 'proportion',
  question: 'How are you proportioned?',
  hint: 'Sit on a chair: is most of your height in your torso or your legs?',
  options: [
    { value: 'long-torso', label: 'Longer torso', sublabel: 'Shorter legs relative to body' },
    { value: 'balanced',   label: 'Balanced',     sublabel: 'Torso and legs about even' },
    { value: 'long-legs',  label: 'Longer legs',  sublabel: 'Shorter torso relative to body' },
  ],
}

export const BUILD_QUESTION: BodyQuestion<BuildType> = {
  field: 'build',
  question: 'Which best describes your build?',
  hint: 'No judgement — this just tunes how fitted vs relaxed we suggest.',
  options: [
    { value: 'slim',     label: 'Slim',     sublabel: 'Lean throughout' },
    { value: 'average',  label: 'Average',  sublabel: 'Neither slim nor heavy' },
    { value: 'athletic', label: 'Athletic', sublabel: 'Muscular / V-shape' },
    { value: 'fuller',   label: 'Fuller',   sublabel: 'Carry some weight, rounder middle' },
  ],
}

export const BODY_QUESTIONS = [
  HEIGHT_QUESTION,
  SHOULDER_QUESTION,
  PROPORTION_QUESTION,
  BUILD_QUESTION,
] as const

// ─── Cut detection from product names ─────────────────────────────────────────
// Catalog product names carry fit hints ("Slim Fit", "Relaxed Fit", "Wide Leg").

export function inferCutFromName(name: string): GarmentCut {
  const n = name.toLowerCase()
  if (/\boversized\b/.test(n)) return 'oversized'
  if (/\bwide[- ]?leg\b|\bwide\b|\bbaggy\b/.test(n)) return 'wide'
  if (/\bloose\b|\brelaxed\b/.test(n)) return 'relaxed'
  if (/\bskinny\b|\bslim\b|\bmuscle\b/.test(n)) return 'slim'
  if (/\btapered\b|\bcarrot\b/.test(n)) return 'tapered'
  if (/\bregular\b|\bstraight\b|\bclassic\b/.test(n)) return 'regular'
  return 'regular'
}

// Numeric "looseness" of each cut, 1 (tightest) → 6 (loosest)
const CUT_LOOSENESS: Record<GarmentCut, number> = {
  slim: 1, tapered: 2, regular: 3, relaxed: 4, wide: 5, oversized: 6,
}

// ─── Body-fit scoring ─────────────────────────────────────────────────────────
// Returns a score delta (roughly -14 … +12) and a short reason describing how
// well a garment cut suits the wearer's proportions. Tops and bottoms behave
// differently, so category matters.

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

  // ── Height: short frames are overwhelmed by volume; tall frames carry it ──
  if (profile.height === 'short') {
    if (loose >= 5) { delta -= 10; reasons.push('wide/oversized cuts shorten a smaller frame') }
    else if (loose === 4) { delta -= 4; reasons.push('relaxed cuts add bulk to a shorter frame') }
    else if (loose <= 2) { delta += 6; reasons.push('slim/tapered lines elongate a shorter frame') }
  } else if (profile.height === 'tall') {
    if (loose >= 4) { delta += 5; reasons.push('your height carries relaxed volume well') }
    if (loose <= 1 && isTop) { delta -= 2; reasons.push('very slim tops can look stretched on a tall frame') }
  }

  // ── Shoulders: broad needs balance, narrow benefits from structure ──
  if (profile.shoulders === 'broad') {
    if (isTop && loose >= 5) { delta -= 8; reasons.push('oversized tops exaggerate broad shoulders') }
    if (isTop && loose <= 2) { delta += 4; reasons.push('cleaner tops let broad shoulders read as strong, not bulky') }
    if (isBottom && loose <= 2) { delta += 6; reasons.push('tapered bottoms balance broad shoulders') }
    if (isBottom && loose >= 5) { delta -= 4; reasons.push('wide bottoms make a broad upper body look top-heavy') }
  } else if (profile.shoulders === 'narrow') {
    if (isTop && (loose === 3 || loose === 4)) { delta += 5; reasons.push('a bit of structure/volume up top builds out narrow shoulders') }
    if (isTop && loose <= 1) { delta -= 3; reasons.push('very slim tops emphasise narrow shoulders') }
    if (isBottom && loose >= 5) { delta -= 3; reasons.push('wide bottoms can overpower a narrower upper body') }
  }

  // ── Proportion: high vs low rise & top length play off torso/leg balance ──
  if (profile.proportion === 'long-torso') {
    // Legs look shorter — keep bottoms clean to lengthen the leg line
    if (isBottom && loose <= 3) { delta += 3; reasons.push('streamlined bottoms lengthen the leg line') }
    if (isBottom && loose >= 5) { delta -= 3; reasons.push('wide bottoms shorten an already-shorter leg line') }
  } else if (profile.proportion === 'long-legs') {
    // Long legs can carry volume on the bottom
    if (isBottom && loose >= 4) { delta += 3; reasons.push('long legs carry wide/relaxed bottoms well') }
  }

  // ── Build: how fitted should things be ──
  if (profile.build === 'slim') {
    if (loose >= 6) { delta -= 5; reasons.push('oversized swamps a slim build') }
    if (loose <= 2) { delta += 3; reasons.push('fitted cuts suit a slim build') }
  } else if (profile.build === 'athletic') {
    if (loose <= 2) { delta += 4; reasons.push('tapered/slim cuts show an athletic build') }
    if (loose >= 6) { delta -= 4; reasons.push('oversized hides an athletic build') }
  } else if (profile.build === 'fuller') {
    if (loose <= 1) { delta -= 6; reasons.push('very slim cuts cling on a fuller build') }
    if (loose >= 6) { delta -= 5; reasons.push('oversized adds visual bulk to a fuller build') }
    if (loose === 3 || loose === 4) { delta += 5; reasons.push('regular/relaxed cuts skim a fuller build cleanly') }
  }

  // Clamp so a single attribute can't dominate the colour score
  delta = Math.max(-14, Math.min(12, delta))
  const reason = reasons[0] ?? ''
  return { delta, reason }
}

// ─── Plain-language fit tips for the whole profile ────────────────────────────
// Shown as a banner in the wardrobe so the user understands their own guidance.

export function fitTipsFor(profile: BodyProfile): string[] {
  const tips: string[] = []

  if (profile.shoulders === 'broad') {
    tips.push('Balance your broad shoulders with slim or tapered trousers — keep volume off the bottom half.')
  } else if (profile.shoulders === 'narrow') {
    tips.push('Build out your shoulders with a bit of structure up top — a regular-fit overshirt or a jacket with defined shoulders.')
  }

  if (profile.height === 'short') {
    tips.push('Keep one colour from shoulder to shoe where you can — vertical, unbroken lines make a shorter frame read taller.')
    tips.push('Avoid wide-leg and oversized cuts; slim and regular fits keep your proportions clean.')
  } else if (profile.height === 'tall') {
    tips.push('You can carry relaxed and wide cuts that overwhelm shorter frames — use them to add presence.')
    tips.push('Break up your outfit with a colour change at the waist so you don’t look stretched.')
  }

  if (profile.proportion === 'long-torso') {
    tips.push('Your legs are the shorter part — higher-rise, streamlined trousers and a slightly shorter top lengthen the leg line.')
  } else if (profile.proportion === 'long-legs') {
    tips.push('Your torso is the shorter part — untucked or longer tops and mid-rise trousers balance you out.')
  }

  if (profile.build === 'fuller') {
    tips.push('Skip both skin-tight and oversized — regular and relaxed cuts in structured fabric skim cleanly.')
  } else if (profile.build === 'athletic') {
    tips.push('Tapered and slim cuts show your build; size for the shoulders and have the waist taken in if needed.')
  } else if (profile.build === 'slim') {
    tips.push('Fitted and tapered cuts suit you; layering adds welcome visual weight.')
  }

  return tips
}

// One-line human summary of the profile, e.g. for a badge/subtitle.
export function bodyProfileSummary(p: BodyProfile): string {
  const h = { short: 'Shorter', average: 'Average-height', tall: 'Taller' }[p.height]
  const s = { narrow: 'narrow-shouldered', average: 'balanced', broad: 'broad-shouldered' }[p.shoulders]
  const b = { slim: 'slim', average: 'average', athletic: 'athletic', fuller: 'fuller' }[p.build]
  return `${h}, ${s}, ${b} build`
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
