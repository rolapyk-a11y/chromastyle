'use client'

import type { ColorAnalysis, SubSeason, Season, SkinUndertone } from './types'

// ─── Color space utilities ───────────────────────────────────────────────────

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rr = r / 255, gg = g / 255, bb = b / 255
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92

  const X = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047
  const Y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000
  const Z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883

  const fx = X > 0.008856 ? Math.cbrt(X) : 7.787 * X + 16 / 116
  const fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116
  const fz = Z > 0.008856 ? Math.cbrt(Z) : 7.787 * Z + 16 / 116

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

// ITA (Individual Typology Angle) — standard dermatology metric for skin tone.
// Higher ITA = lighter/fairer. Used alongside b* for season classification.
function ita(L: number, b: number): number {
  if (b === 0) b = 0.001
  return Math.atan((L - 50) / b) * (180 / Math.PI)
}

// ─── Robust pixel sampling ───────────────────────────────────────────────────
// Collects pixels from landmark points, filters out noise (specular highlights,
// deep shadows, beard stubble, high-saturation areas like lips), then returns
// the median RGB — much more stable than a raw mean.

function collectSkinPixels(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  radius = 8
): Array<[number, number, number]> {
  const valid: Array<[number, number, number]> = []

  for (const pt of points) {
    const x = Math.max(0, Math.round(pt.x - radius))
    const y = Math.max(0, Math.round(pt.y - radius))
    const size = radius * 2
    const { data } = ctx.getImageData(x, y, size, size)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 200) continue

      const brightness = (r + g + b) / 3
      if (brightness < 45) continue   // deep shadow / stubble / dark beard
      if (brightness > 232) continue  // specular highlight

      const lab = rgbToLab(r, g, b)
      const chroma = Math.sqrt(lab[1] ** 2 + lab[2] ** 2)
      if (chroma > 38) continue       // lips, blushing, redness
      if (lab[1] > 22) continue       // very red pixels — not skin undertone

      valid.push([r, g, b])
    }
  }

  return valid
}

// Returns the median value of each channel — much more robust than mean for
// noisy image data.
function medianRgb(pixels: Array<[number, number, number]>): [number, number, number] {
  if (pixels.length === 0) return [180, 150, 130]

  // Sort by overall brightness, take the middle 50% to reject remaining outliers
  const sorted = [...pixels].sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))
  const lo = Math.floor(sorted.length * 0.25)
  const hi = Math.ceil(sorted.length * 0.75)
  const mid = sorted.slice(lo, hi)
  if (mid.length === 0) return sorted[Math.floor(sorted.length / 2)]

  const n = mid.length
  return [
    mid.reduce((s, c) => s + c[0], 0) / n,
    mid.reduce((s, c) => s + c[1], 0) / n,
    mid.reduce((s, c) => s + c[2], 0) / n,
  ]
}

function collectHairPixels(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
): [number, number, number] {
  const cx = Math.max(0, Math.round(x))
  const cy = Math.max(0, Math.round(y))
  const { data } = ctx.getImageData(cx, cy, Math.round(w), Math.round(h))
  const pixels: Array<[number, number, number]> = []

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 200) continue
    const brightness = (r + g + b) / 3
    // Hair: reject background (very bright) and reject skin-toned pixels
    if (brightness > 210) continue  // likely sky/wall background
    if (brightness < 8) continue    // pure black — likely background not hair
    pixels.push([r, g, b])
  }

  if (pixels.length < 10) return [80, 60, 50]  // default dark hair
  return medianRgb(pixels)
}

// ─── Face detection ──────────────────────────────────────────────────────────

let faceApiLoaded = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceApiModule: any = null

async function loadFaceApi() {
  if (faceApiLoaded && faceApiModule) return faceApiModule
  const faceapi = await import('face-api.js')
  const MODEL_URL = '/models'
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ])
  faceApiLoaded = true
  faceApiModule = faceapi
  return faceapi
}

interface SampledColors {
  skin: [number, number, number]
  hair: [number, number, number]
  eye: [number, number, number]
  faceDetected: boolean
}

async function sampleColorsFromImage(imageEl: HTMLImageElement): Promise<SampledColors> {
  const canvas = document.createElement('canvas')
  canvas.width = imageEl.naturalWidth
  canvas.height = imageEl.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(imageEl, 0, 0)

  const W = canvas.width
  const H = canvas.height

  try {
    const faceapi = await loadFaceApi()
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.25, inputSize: 416 }))
      .withFaceLandmarks(true)

    if (detection) {
      const { box } = detection.detection
      const lm = detection.landmarks.positions

      // Skin: cheek landmarks (1,3,5,11,13,15) + forehead midpoint
      const skinPoints = [1, 3, 5, 11, 13, 15].map(i => lm[i])
      // Add forehead — above brow midpoint (landmarks 17-26 are brows)
      const browMidX = (lm[17].x + lm[26].x) / 2
      const browMidY = (lm[17].y + lm[26].y) / 2
      skinPoints.push({ x: browMidX, y: browMidY - box.height * 0.1 })

      const skinPixels = collectSkinPixels(ctx, skinPoints, 10)
      const skin = medianRgb(skinPixels.length >= 20 ? skinPixels : skinPixels.concat(
        // fallback: if landmarks gave few valid pixels, try cheek centre regions
        collectSkinPixels(ctx, [
          { x: box.x + box.width * 0.2, y: box.y + box.height * 0.55 },
          { x: box.x + box.width * 0.8, y: box.y + box.height * 0.55 },
        ], 15)
      ))

      // Hair: region above the face bounding box
      const hairY = Math.max(0, box.y - box.height * 0.35)
      const hair = collectHairPixels(
        ctx,
        box.x + box.width * 0.15,
        hairY,
        box.width * 0.7,
        box.height * 0.35
      )

      // Eyes: iris area between inner/outer corners (landmarks 36-41 left, 42-47 right)
      const eyePoints = [37, 38, 40, 41, 43, 44, 46, 47].map(i => lm[i])
      const eyePixels = collectSkinPixels(ctx, eyePoints, 4)
      // Eyes need different filtering — allow darker pixels
      const rawEyePixels: Array<[number, number, number]> = []
      for (const pt of eyePoints) {
        const ed = ctx.getImageData(Math.round(pt.x - 4), Math.round(pt.y - 4), 8, 8).data
        for (let i = 0; i < ed.length; i += 4) {
          if (ed[i + 3] < 200) continue
          rawEyePixels.push([ed[i], ed[i + 1], ed[i + 2]])
        }
      }
      const eye = medianRgb(rawEyePixels.length > 0 ? rawEyePixels : eyePixels)

      return { skin, hair, eye, faceDetected: true }
    }
  } catch {
    // face-api failed — fall through
  }

  // No face detected — return signal to caller
  return {
    skin: [0, 0, 0],
    hair: [0, 0, 0],
    eye: [0, 0, 0],
    faceDetected: false,
  }
}

// ─── Season classification ────────────────────────────────────────────────────
// Uses ITA + Lab b* (warm/cool axis) + L* (lightness) + chroma.
// ITA is a validated dermatology metric that's more stable than raw b* alone.

function classifySeason(colors: SampledColors, knownUndertone?: 'warm' | 'cool'): {
  subSeason: SubSeason
  season: Season
  undertone: SkinUndertone
  skinLab: [number, number, number]
  hairLab: [number, number, number]
} {
  const skinLab = rgbToLab(...colors.skin)
  const hairLab = rgbToLab(...colors.hair)
  const eyeLab = rgbToLab(...colors.eye)

  const [skinL, skinA, skinB] = skinLab
  const [hairL, , hairB] = hairLab
  const [eyeL] = eyeLab

  // ITA: higher = lighter/cooler-looking skin. Key range for seasons:
  // ITA > 45: very fair → Light Spring/Summer, True Winter
  // ITA 20-45: medium → most seasons possible
  // ITA < 10: deep → Dark Autumn/Winter
  const skinITA = ita(skinL, skinB)

  // Lab chroma = sqrt(a²+b²) — measures colour intensity of skin
  const skinChroma = Math.sqrt(skinA ** 2 + skinB ** 2)

  // Eye contrast: how different are eyes from skin lightness
  const eyeContrast = Math.abs(skinL - eyeL)

  // Hair warmth: b* > 12 = warm/golden, < 6 = cool/ashy
  const hairIsWarm = hairB > 12
  const hairIsDark = hairL < 38

  // Undertone: use the vein-colour answer if provided — it's more reliable
  // than camera pixel data for the warm/cool axis.
  let undertone: SkinUndertone
  let isWarm: boolean
  if (knownUndertone) {
    isWarm = knownUndertone === 'warm'
    undertone = knownUndertone
  } else if (skinB > 14) {
    isWarm = true; undertone = 'warm'
  } else if (skinB < 9) {
    isWarm = false; undertone = 'cool'
  } else {
    isWarm = hairIsWarm; undertone = 'neutral'
  }

  let subSeason: SubSeason
  let season: Season

  if (isWarm) {
    // ── WARM FAMILY (Spring/Autumn) ──────────────────────────────────────────
    if (skinL > 56) {
      // Light + warm → Light Spring.
      // Threshold lowered from 62: artificial light underestimates L* by ~5-8 points,
      // so true Light Springs often read 56-62 on camera.
      subSeason = 'light-spring'; season = 'spring'
    } else if (skinChroma > 26 && skinL > 48) {
      // Medium-light + warm + vivid → True Spring
      subSeason = 'true-spring'; season = 'spring'
    } else if (skinChroma > 20 && hairIsWarm && !hairIsDark) {
      // Warm + some chroma + warm golden hair → Warm Spring
      subSeason = 'warm-spring'; season = 'spring'
    } else if (skinChroma < 20 && skinL < 58) {
      // Warm + muted + medium-dark skin → Soft Autumn.
      // skinL < 58 guard prevents light-skinned warm people from landing here.
      subSeason = 'soft-autumn'; season = 'autumn'
    } else if (skinL < 42 || (hairIsDark && skinB > 18)) {
      // Dark + warm → Dark Autumn
      subSeason = 'dark-autumn'; season = 'autumn'
    } else if (skinL > 50 && skinChroma < 24) {
      // Medium-light + warm + soft chroma → Light Spring (catches edge cases)
      subSeason = 'light-spring'; season = 'spring'
    } else {
      // Medium warm, earthy → True Autumn
      subSeason = 'true-autumn'; season = 'autumn'
    }
  } else if (!isWarm) {
    // ── COOL FAMILY (Summer/Winter) ──────────────────────────────────────────
    if (skinL > 65) {
      // Very light + cool → Light Summer
      subSeason = 'light-summer'; season = 'summer'
    } else if (skinChroma < 18 && !hairIsDark) {
      // Cool + muted + medium hair → Soft Summer
      subSeason = 'soft-summer'; season = 'summer'
    } else if (skinChroma < 22 && skinITA > 20) {
      // Cool + muted + medium lightness → True Summer
      subSeason = 'true-summer'; season = 'summer'
    } else if (skinChroma > 26 && eyeContrast > 35) {
      // Cool + vivid + high eye contrast → Clear Winter
      subSeason = 'clear-winter'; season = 'winter'
    } else if (skinL < 44 || hairIsDark) {
      // Deep cool → Dark Winter
      subSeason = 'dark-winter'; season = 'winter'
    } else {
      // Cool + medium depth + clear → True Winter
      subSeason = 'true-winter'; season = 'winter'
    }
  } else {
    // ── NEUTRAL (b* 9-14): use hair as tiebreaker ────────────────────────────
    if (hairIsWarm) {
      if (skinL > 54) {
        subSeason = 'light-spring'; season = 'spring'
      } else if (skinChroma < 20 && skinL < 56) {
        subSeason = 'soft-autumn'; season = 'autumn'
      } else {
        subSeason = 'true-autumn'; season = 'autumn'
      }
    } else {
      if (skinL > 63) {
        subSeason = 'light-summer'; season = 'summer'
      } else if (skinChroma < 20) {
        subSeason = 'soft-summer'; season = 'summer'
      } else if (eyeContrast > 35) {
        subSeason = 'true-winter'; season = 'winter'
      } else {
        subSeason = 'true-summer'; season = 'summer'
      }
    }
  }

  return { subSeason, season, undertone, skinLab, hairLab }
}

// ─── Palette lookup ───────────────────────────────────────────────────────────

const SEASON_PALETTES: Record<SubSeason, {
  best: string[]
  avoid: string[]
  eyeEnhancing: string[]
  skinAnalysis: string
  eyeAnalysis: string
  hairAnalysis: string
  recommendation: string
  styleTips: string[]
}> = {
  'light-spring': {
    // Validated against reference palettes (dream-wardrobe.com, 30somethingurbangirl.com)
    // Warm + Light + soft chroma. Characteristic colours: peach, apricot, warm mint,
    // banana yellow, honey, taffy pink, powder blue (warm-tinted), camel, ivory.
    best: [
      '#F5A886', // Apricot — the Light Spring signature warm coral-orange
      '#F4C4A4', // Peach — soft warm peachy, essential Spring
      '#ECA0A0', // Soft Watermelon — warm pink-red, very flattering
      '#F0B4C4', // Taffy Pink — warm candy pink
      '#F8E080', // Banana Yellow — pale warm yellow, typical Light Spring
      '#E8C058', // Honey — golden warm yellow
      '#94D4B0', // Warm Mint — Spring's signature green, warm-tinted not cool
      '#B4D890', // Pistachio — warm yellow-green
      '#A8C4DC', // Powder/Denim Blue — warm-tinted muted blue (key Light Spring neutral)
      '#D4BCAC', // Warm Blush Beige — neutral close to skin
      '#C4A070', // Camel — the Light Spring neutral (replaces black)
      '#F2E4D0', // Ivory Cream — warm off-white (replaces stark white)
    ],
    avoid: [
      '#1A1A1A', // Near black — too harsh, drains Light Spring
      '#F5F5F5', // Stark white — use ivory instead
      '#1A237E', // Dark navy — too cool and deep
      '#36454F', // Charcoal grey — too cool
      '#4A148C', // Deep purple — too cool and vivid
      '#1B5E20', // Dark forest green — too dark and cool
    ],
    eyeEnhancing: ['#94D4B0','#A8C4DC','#F5A886','#ECA0A0'],
    skinAnalysis: 'Light, delicate skin with warm peachy-golden undertones. Soft and luminous — typical of Light Spring.',
    eyeAnalysis: 'Soft, clear eyes — light to medium in depth with warm undertones. Sparkle most against warm mint and soft coral.',
    hairAnalysis: 'Light to medium hair with golden or warm highlights — blonde, red-gold, or warm light brown.',
    recommendation: 'Your palette is sun-warmed and delicate. Peach, apricot, warm mint, and honey yellow are your signature colours. Always reach for ivory over white, and camel over black.',
    styleTips: [
      'Replace black with camel or warm chocolate brown — much more flattering',
      'Replace stark white with ivory or warm cream',
      'Peach and apricot near your face will make your complexion glow',
      'Warm mint and pistachio green are your best cool-looking tones',
      'Yellow gold jewellery only — silver will look cold against your skin',
    ],
  },
  'true-spring': {
    // Warmer and more vivid than Light Spring. Characteristic colours: warm coral,
    // golden yellow, turquoise (warm-tinted), aqua, warm orange, clear greens, caramel.
    best: [
      '#F4892C', // Warm Coral Orange — vivid, the True Spring statement colour
      '#F5B030', // Golden Yellow — clear and warm, not greenish
      '#F9D840', // Daisy Yellow — bright warm yellow
      '#F5A870', // Warm Peach — richer than Light Spring
      '#48C898', // Clear Warm Turquoise — aqua-green, the Spring blue-green
      '#70C870', // Clear Warm Green — bright and fresh
      '#F09060', // Warm Orange — vivid, very True Spring
      '#E8C060', // Warm Gold — medium warm yellow
      '#C89050', // Caramel — warm medium neutral
      '#D4A840', // Warm Amber — golden neutral
      '#A0785A', // Warm Brown — the True Spring neutral (replaces black)
      '#F8E8C0', // Warm Cream — off-white neutral
    ],
    avoid: [
      '#6A5ACD', // Cool slate blue — clashes with warm colouring
      '#4169E1', // Royal cool blue — too cool
      '#778899', // Cool grey — drains warmth
      '#696969', // Mid grey — no warmth, dulls complexion
      '#2F4F4F', // Dark slate — too cool and muted
      '#1A1A2E', // Dark cool navy — wrong family
    ],
    eyeEnhancing: ['#48C898','#F4892C','#E8C060','#70C870'],
    skinAnalysis: 'Warm golden skin with clear, bright undertones — the classic sunny Spring complexion.',
    eyeAnalysis: 'Warm, clear eyes — green, hazel, or warm brown. Ignite against golden yellow, warm coral, and clear turquoise.',
    hairAnalysis: 'Golden, warm-toned hair — blonde, strawberry, warm red, or golden brown.',
    recommendation: 'Your colours are sunny and vibrant. Golden yellow, warm coral, and clear turquoise are your power colours. Avoid anything grey or cool-toned.',
    styleTips: [
      'Clear warm turquoise and aqua are your best blue alternatives',
      'Warm coral near your face amplifies your natural glow',
      'Caramel and warm brown are your everyday neutrals',
      'Yellow gold and brass jewellery always — no silver',
      'Bold warm colour-blocking works well on your colouring',
    ],
  },
  'warm-spring': {
    // Bridges Spring → Autumn. Richer and deeper than True Spring.
    // Characteristic colours: rich coral, warm amber, golden yellow, warm olive, camel.
    best: [
      '#E8782A', // Rich Coral — deeper than True Spring
      '#D4942A', // Warm Amber — golden brown-orange
      '#E8C430', // Rich Yellow — warm golden
      '#C8A040', // Dark Gold — warm rich neutral
      '#60B878', // Warm Olive Green — yellow-green, earthy
      '#A0C050', // Yellow-Green — warm and slightly earthy
      '#F0A860', // Warm Peach — richer than lighter Springs
      '#C87840', // Caramel Brown — warm medium neutral
      '#A06030', // Warm Cognac — deep warm neutral
      '#D4A870', // Warm Tan — light warm neutral
      '#E8D4A0', // Warm Sand — light neutral
      '#6A4020', // Warm Dark Brown — replaces black
    ],
    avoid: [
      '#708090', // Slate grey — too cool
      '#B0C4DE', // Light steel blue — too cool
      '#4169E1', // Royal blue — too cool
      '#6A5ACD', // Slate blue — wrong family
      '#2F4F4F', // Dark cool slate — too cool
      '#1C1C1C', // Near black — use warm dark brown instead
    ],
    eyeEnhancing: ['#E8782A','#D4942A','#60B878','#C8A040'],
    skinAnalysis: 'Rich warm skin with golden-amber undertones — bridging Spring and Autumn with depth and warmth.',
    eyeAnalysis: 'Deep warm eyes — hazel, amber, or warm green. Ignite against rich coral, amber, and warm olive.',
    hairAnalysis: 'Medium to dark warm hair with golden, auburn, or red-brown tones.',
    recommendation: 'You carry richer warm colours than most Springs. Amber, rich coral, and warm olive are your signature. Go deeper than Light Spring, but stay firmly warm.',
    styleTips: [
      'You can wear richer, deeper warm colours than lighter Springs',
      'Warm dark brown replaces black — rich chocolate works well',
      'Amber and cognac are your best neutrals',
      'Yellow gold jewellery is essential — avoid silver',
      'Olive green is your best green — avoid cool or dark greens',
    ],
  },
  'light-summer': {
    // Cool + Light + muted. The coolest and lightest of the Summers.
    // Characteristic colours: powder blue, soft lavender, blush rose, misty blue,
    // pearl grey, dusty pink, icy lilac, soft periwinkle, cool mint, light mauve.
    best: [
      '#BDD7EE', // Powder Blue — the Light Summer signature, almost a neutral
      '#C5B8D9', // Soft Lavender — delicate cool purple-blue
      '#E0AABB', // Rose Pink — cool pink, not warm coral
      '#AEBAD8', // Soft Periwinkle — blue-violet, very wearable
      '#C0D5E8', // Misty Blue — hazy, ethereal blue
      '#D4C4E0', // Icy Lilac — pale cool purple
      '#D5D8DC', // Pearl Grey — the Light Summer neutral (replaces black)
      '#D4A8B4', // Dusty Pink — muted cool pink
      '#AECCC0', // Cool Sage — greyed green, cool-toned not warm
      '#C8B4CC', // Soft Mauve — pale cool purple-pink
      '#D8E4F0', // Ice Blue — almost white, very light blue
      '#F0D8E0', // Blush — the palest cool pink, near-neutral
    ],
    avoid: [
      '#D2691E', // Warm copper — too orange and warm
      '#DAA520', // Goldenrod — too warm and yellow
      '#8B4513', // Saddle brown — too warm and earthy
      '#FF8C00', // Dark orange — clashes with cool undertones
      '#808000', // Olive — too warm and yellow-green
      '#A0522D', // Sienna — too warm and rich
    ],
    eyeEnhancing: ['#BDD7EE', '#AEBAD8', '#C5B8D9', '#D4A8B4'],
    skinAnalysis: 'Light, delicate skin with cool blue-pink undertones — porcelain and ethereal. The fairest of all seasons.',
    eyeAnalysis: 'Soft, light eyes — pale blue, grey, or faded green. They shimmer most against powder blue, icy lilac, and soft periwinkle.',
    hairAnalysis: 'Light cool-toned hair — ash blonde, platinum, cool light brown, or naturally greying hair.',
    recommendation: 'Your palette is cool, light, and quietly beautiful. Powder blue is almost a neutral for you. Build outfits from misty blue, icy lilac, and soft lavender — then let pearl grey anchor them.',
    styleTips: [
      'Powder blue is your version of a neutral — wear it head to toe',
      'Pearl grey replaces black perfectly — softer and more flattering',
      'Replace white with the palest icy blue or blush — pure white can overpower',
      'Monochromatic cool tones from the same colour family look effortlessly elegant',
      'Silver and white gold jewellery only — yellow gold will look jarring',
    ],
  },
  'true-summer': {
    // Cool + medium depth + muted chroma. The classic Summer.
    // Characteristic colours: dusty rose, bluebell, slate blue, soft teal, muted mauve,
    // medium rose, muted navy, dusty lavender, cool heather, soft burgundy.
    best: [
      '#C88898', // Dusty Rose — the True Summer signature, cool and muted
      '#6A7EAF', // Bluebell — muted blue-violet, quintessential Summer
      '#5A8A90', // Soft Teal — cool muted teal, very sophisticated
      '#9A7898', // Muted Mauve — cool greyed purple-pink
      '#7080A0', // Slate Blue — cool medium blue, the best Summer neutral
      '#C07090', // Medium Rose — deeper than Light Summer's pink
      '#8890C0', // Periwinkle — blue-violet, very wearable
      '#907888', // Soft Burgundy — muted cool wine
      '#485870', // Muted Navy — the True Summer navy (replaces black)
      '#9088B8', // Dusty Lavender — muted purple
      '#8AA898', // Cool Sage — greyed green, not warm
      '#9898A8', // Heather Grey — cool blue-grey neutral
    ],
    avoid: [
      '#D2691E', // Warm copper/tan — too warm
      '#DAA520', // Golden yellow — too warm
      '#FF8C00', // Orange — clashes severely
      '#8B4513', // Warm brown — wrong family
      '#A52A2A', // Warm red-brown — too warm
      '#FF6347', // Tomato — too warm and vivid
    ],
    eyeEnhancing: ['#5A8A90', '#7080A0', '#6A7EAF', '#8890C0'],
    skinAnalysis: 'Medium cool skin with rose or blue-pink undertones — refined, elegant, and quietly beautiful.',
    eyeAnalysis: 'Soft, cool eyes — grey-blue, blue-grey, or cool hazel. Come alive against slate blue, bluebell, and soft teal.',
    hairAnalysis: 'Medium cool-toned hair — ash brown, cool medium brown, or dark ash blonde. Often has no warm highlights.',
    recommendation: 'Your palette is cool and muted — the most quietly sophisticated of all seasons. Dusty rose, bluebell, and slate blue are your signature. Avoid anything warm or earthy.',
    styleTips: [
      'Muted navy is your best neutral — it does what black does for Winter',
      'Dusty rose is your power colour — near your face it looks luminous',
      'Monochromatic outfits in cool muted tones are very chic on you',
      'Avoid bright, vivid colours — always reach for the greyed, muted version',
      'Silver jewellery only — white gold or platinum',
    ],
  },
  'soft-summer': {
    // Cool-neutral + muted. Bridges Summer and Autumn — slightly warmer than True Summer
    // but always greyed and soft. Characteristic colours: dusty blue, muted rose,
    // greyed lavender, warm grey, soft sage, taupe, muted periwinkle, smoky mauve.
    best: [
      '#7898B8', // Dusty Blue — the Soft Summer signature, greyed blue
      '#9888B0', // Muted Lavender — greyed purple, not vivid
      '#A898A8', // Greyed Mauve — cool-neutral purple-grey
      '#88A090', // Soft Sage — greyed green, slightly warm
      '#A8A0B4', // Warm Grey Lavender — neutral bridging tone
      '#C0A0A8', // Dusty Pink — muted warm-cool pink
      '#B08898', // Muted Rose — deeper dusty pink
      '#8890A8', // Greyed Blue — neutral grey-blue
      '#9090B8', // Dusty Periwinkle — greyed blue-violet
      '#A8A098', // Warm Taupe — neutral bridging colour
      '#A0A888', // Soft Khaki — muted warm-cool green
      '#907888', // Muted Plum — deep greyed purple
    ],
    avoid: [
      '#FF6600', // Vivid orange — too vivid and warm
      '#FFD700', // Gold — too warm and bright
      '#FF0000', // Pure red — too vivid
      '#00FF00', // Pure green — too vivid
      '#FF69B4', // Hot pink — too vivid and bright
      '#FF8C00', // Dark orange — too warm
    ],
    eyeEnhancing: ['#7898B8', '#9090B8', '#9888B0', '#88A090'],
    skinAnalysis: 'Cool-neutral skin with a soft, greyed quality — bridging Summer and Autumn. Colours look best when they echo the greyed, misty quality of your colouring.',
    eyeAnalysis: 'Soft, muted eyes — grey-green, grey-blue, or muted hazel. Shine most against dusty blue, muted periwinkle, and greyed lavender.',
    hairAnalysis: 'Medium cool-to-neutral hair — ashy or muted brown, often with no obvious warm or cool highlights.',
    recommendation: 'Your palette is greyed and sophisticated — deliberately muted. Dusty blue, warm grey, and soft sage are your foundation. Bright or vivid colours in any temperature will overpower you.',
    styleTips: [
      'Deliberately greyed colours are your superpower — dusty blue, muted mauve, smoky sage',
      'Always choose the muted version of a colour, never the vivid one',
      'Warm taupe and greyed mauve make excellent everyday neutrals',
      'Charcoal grey is much better than true black',
      'Brushed silver or oxidised metal jewellery — not bright polished gold or silver',
    ],
  },
  'soft-autumn': {
    // Warm-neutral + muted. The most gentle of all Autumns — soft and earthy.
    // Characteristic colours: sage green, terracotta (muted), warm taupe, muted peach,
    // warm camel, muted gold, warm mushroom, dusty coral, warm greige, oyster.
    best: [
      '#9CAF88', // Sage Green — the Soft Autumn signature, warm-greyed green
      '#BDBFA0', // Warm Grey-Green — muted olive-grey, excellent neutral
      '#D9927A', // Soft Terracotta — muted warm coral, not vivid orange
      '#D2B48C', // Tan/Camel — the warm neutral backbone
      '#B8A99A', // Warm Taupe — greyed warm neutral
      '#D1B7A3', // Warm Beige — light warm neutral
      '#D99058', // Warm Camel-Amber — deeper warm neutral
      '#C8A888', // Warm Sand — light warm neutral
      '#B8987A', // Warm Brown — medium earthy neutral
      '#D9A6A6', // Dusty Blush — muted warm pink-rose
      '#C48793', // Dusty Mauve — muted warm pink
      '#D4B898', // Wheat — pale warm neutral (replaces white)
    ],
    avoid: [
      '#0000FF', // Pure blue — too cool and vivid
      '#4169E1', // Royal blue — too cool
      '#9400D3', // Vivid purple — too cool and vivid
      '#4B0082', // Indigo — too cool and dark
      '#00FFFF', // Cyan — too cool and vivid
      '#B0E0E6', // Powder blue — too cool
    ],
    eyeEnhancing: ['#D9927A', '#C8A888', '#9CAF88', '#D2B48C'],
    skinAnalysis: 'Warm-neutral skin with soft, muted golden undertones — gentle and approachable rather than vivid or rich.',
    eyeAnalysis: 'Soft warm eyes — hazel, soft warm brown, or muted green-grey. Glow most against muted terracotta, sage, and warm tan.',
    hairAnalysis: 'Medium warm-neutral hair — mousy brown, warm ash brown, or soft dirty blonde. Not vividly warm or obviously cool.',
    recommendation: 'Your palette is the most wearable of all seasons — soft, warm, and quietly earthy. Sage green, terracotta, and warm taupe are your everyday foundation. Stay muted always.',
    styleTips: [
      'Sage green is your signature — wear it near your face for an instant glow',
      'Replace black with warm chocolate brown or dark camel',
      'Replace white with warm cream, oyster, or wheat — pure white looks harsh',
      'Muted terracotta and dusty rose are your warm-toned accent colours',
      'Hammered gold, matte bronze, or aged copper jewellery suit you perfectly',
    ],
  },
  'true-autumn': {
    // Warm + rich + medium-deep. The purest expression of Autumn.
    // Characteristic colours: burnt orange, rust, mustard, olive green, warm burgundy,
    // chocolate brown, amber, sienna, forest green, dark gold.
    best: [
      '#CC5500', // Burnt Orange — the True Autumn signature colour
      '#B7410E', // Rust — deep warm red-orange, very Autumn
      '#DAA520', // Mustard/Goldenrod — warm golden yellow
      '#708238', // Olive Green — the essential Autumn green
      '#800020', // Burgundy — warm dark red, richer than Winter's red
      '#6B3A2A', // Warm Dark Brown — deep earthy neutral
      '#D4A017', // Warm Gold — medium golden neutral
      '#8B4513', // Saddle Brown — classic warm brown
      '#CD853F', // Peru — golden warm tan
      '#A0522D', // Sienna — rich warm brown-orange
      '#556B2F', // Dark Olive — deeper olive, great neutral
      '#8B6914', // Dark Gold — deep warm golden neutral
    ],
    avoid: [
      '#FF69B4', // Hot pink — too cool and vivid
      '#00BFFF', // Deep sky blue — too cool and bright
      '#E0E0E0', // Light grey — too cool and lifeless
      '#D3D3D3', // Silver grey — too cool
      '#C0C0C0', // Silver — too cool and metallic
      '#F0F8FF', // Alice blue — too cool and pale
    ],
    eyeEnhancing: ['#CC5500', '#708238', '#D4A017', '#CD853F'],
    skinAnalysis: 'Rich warm skin with golden-amber or olive undertones — the purest expression of Autumn warmth and earthiness.',
    eyeAnalysis: 'Warm, rich eyes — deep hazel, amber, warm dark brown, or olive green. Ignite against burnt orange, olive, and warm gold.',
    hairAnalysis: 'Rich warm hair — auburn, warm chestnut, copper, or warm dark brown. Often has red or golden highlights in the light.',
    recommendation: 'You are the quintessential Autumn. Burnt orange, rust, and mustard are your signature. Every earthy, warm colour works on you — nothing cool or grey.',
    styleTips: [
      'Burnt orange is your single best colour — own it',
      'Olive green is your perfect everyday neutral alongside chocolate brown',
      'Dark chocolate brown replaces black — richer and more flattering',
      'Bronze, brass, and copper are your metals — silver looks cold on you',
      'Textured fabrics — tweed, corduroy, suede — in earthy tones are your ideal',
    ],
  },
  'dark-autumn': {
    // Warm + deep + rich. The darkest of the Autumn family.
    // Characteristic colours: deep burgundy, dark forest green, dark olive, dark chocolate,
    // dark teal (warm-leaning), plum (warm), dark rust, mahogany.
    best: [
      '#924819', // Dark Rust — deep warm rust
      '#8A3324', // Deep Rust — very rich warm red-brown
      '#800000', // Maroon — deep warm dark red
      '#4A1B1F', // Very Dark Burgundy — almost black-red
      '#404C24', // Dark Olive — deep earthy green
      '#556B2F', // Dark Olive Green — forest-floor green
      '#675100', // Dark Gold-Brown — deep golden neutral
      '#005F6B', // Dark Teal — the one cool-leaning colour that works
      '#8B4513', // Saddle Brown — warm medium brown
      '#5C4033', // Dark Warm Brown — deep earthy brown
      '#704214', // Dark Caramel — deep warm neutral
      '#954344', // Deep Rose-Brown — warm muted deep rose
    ],
    avoid: [
      '#FFB6C1', // Light pink — too light and cool
      '#E6E6FA', // Lavender — too cool and pastel
      '#B0E0E6', // Powder blue — too cool and light
      '#87CEEB', // Sky blue — too cool and bright
      '#F0F8FF', // Alice blue — too cool and pale
      '#FFFACD', // Lemon chiffon — too light and cool-yellow
    ],
    eyeEnhancing: ['#924819', '#8B4513', '#404C24', '#005F6B'],
    skinAnalysis: 'Deep warm skin with rich amber, olive, or bronze undertones — the most powerful and dramatic of all warm seasons.',
    eyeAnalysis: 'Deep, rich eyes — very dark brown, deep amber, or dark hazel with almost no light in them. They carry tremendous depth.',
    hairAnalysis: 'Very dark warm hair — deep chocolate, very dark auburn, or near-black hair with warm (not cool) undertones.',
    recommendation: 'Your palette is dramatic, moody, and luxurious. Deep burgundy, dark olive, and dark chocolate are your anchors. Go deep and stay warm.',
    styleTips: [
      'Deep burgundy and wine are your statement colours — nothing else commands a room like these on you',
      'Dark olive and army green make you look powerful and grounded',
      'Very dark chocolate brown is your black — use it everywhere',
      'Velvet, suede, and leather in deep earthy tones are your fabrics',
      'Antiqued bronze and oxidised gold only — never silver',
    ],
  },
  'dark-winter': {
    // Cool + deep + high contrast. The darkest of the Winter family.
    // Characteristic colours: very deep navy, jet black, deep plum, dark forest green,
    // Prussian blue, dark teal, deep burgundy (cool), midnight blue.
    best: [
      '#0D0F1A', // Near Black Blue — deepest Winter neutral
      '#003153', // Prussian Blue — the signature Dark Winter blue
      '#015871', // Dark Teal — deep cool teal
      '#00491E', // Dark Forest Green — deep cool green
      '#7D1B4D', // Dark Magenta-Plum — deep cool plum
      '#5F2566', // Dark Purple — deep cool purple
      '#7A1F3D', // Dark Wine — cool dark red-wine
      '#64242E', // Dark Burgundy — the darkest cool red
      '#1D2327', // Very Dark Grey-Blue — near-black neutral
      '#191970', // Midnight Blue — deep jewel navy
      '#003366', // Dark Navy — classic dark neutral
      '#2C0040', // Very Dark Purple — almost black with purple depth
    ],
    avoid: [
      '#DAA520', // Goldenrod — too warm
      '#FF8C00', // Dark orange — too warm
      '#D2691E', // Warm copper — too warm
      '#8B4513', // Saddle brown — too warm and earthy
      '#C8A000', // Warm gold — too warm
      '#A0522D', // Sienna — too warm and earthy
    ],
    eyeEnhancing: ['#003153', '#015871', '#191970', '#003366'],
    skinAnalysis: 'Deep cool skin — the darkest and most intense of all seasons. Rich depth with cool or neutral undertones.',
    eyeAnalysis: 'Very dark, deep eyes with significant contrast against the whites. Most enhanced by Prussian blue and deep teal, which bring out depth and intensity.',
    hairAnalysis: 'Very dark to black hair — jet black, very dark brown, or very dark cool-toned brown. No warm redness.',
    recommendation: 'Deep navy, jewel tones, and true black are your foundation. You carry depth and intensity. Stay deep and cool — warm earthy tones flatten you completely.',
    styleTips: [
      'Head-to-toe deep navy with a jewel-tone accent is one of your most powerful looks',
      'Deep teal and sapphire blue bring out the intensity of your eyes',
      'True black is perfect on you — one of the few seasons who can wear it this well',
      'Silver, white gold, and platinum only — never yellow gold',
      'High-contrast combinations of deep navy and jewel tones are very striking on you',
    ],
  },
  'true-winter': {
    // Cool + clear + high contrast. The classic Winter.
    // Characteristic colours: true black, pure white, cobalt blue, royal blue, true red,
    // emerald green, hot pink, vivid purple, icy colours, silver grey.
    best: [
      '#000000', // True Black — the Winter neutral
      '#FFFFFF', // Pure White — crisp and powerful
      '#003087', // Dark Cobalt Blue — the signature Winter blue
      '#003366', // Dark Navy — the Winter power neutral
      '#CC0000', // True Red — vivid, clear cool red
      '#9B111E', // Ruby Red — deep clear cool red
      '#E91E8C', // Hot Pink — vivid cool pink
      '#800080', // Purple — true vivid purple
      '#4B0082', // Indigo — deep blue-violet
      '#006400', // Dark Green — clear cool green (emerald family)
      '#A9A9A9', // Dark Grey — cool neutral
      '#C0C0C0', // Silver — the Winter metal colour
    ],
    avoid: [
      '#DAA520', // Goldenrod — too warm
      '#D2691E', // Warm copper — too warm
      '#8B4513', // Saddle brown — too warm and earthy
      '#F5DEB3', // Wheat — too warm and muted
      '#DEB887', // Burlywood — too warm and earthy
      '#BC8F5F', // Rosy brown — too warm
    ],
    eyeEnhancing: ['#003087', '#003366', '#006400', '#800080'],
    skinAnalysis: 'Clear cool skin with the highest contrast of all seasons — either porcelain-fair with pink undertones, or very deep with cool-neutral undertones. Both share the same vivid, clear quality.',
    eyeAnalysis: 'Clear, vivid eyes with strong contrast against the whites. Most dramatic with cobalt blue and ruby red — both colours amplify the eye\'s natural intensity.',
    hairAnalysis: 'Dark cool hair — jet black, very dark cool brown. The contrast between hair and skin is a defining feature.',
    recommendation: 'You are the most dramatic season. Pure black and white, cobalt blue, and true red are your colours. You are built for high contrast and vivid clarity — never muted, never warm.',
    styleTips: [
      'Black and white together is your editorial signature — no other season wears it like you',
      'Cobalt and royal blue are your most transformative colours',
      'True red and ruby red are power colours — wear them when you want to command a room',
      'Avoid earth tones and muted colours — they visually erase your natural high contrast',
      'Polished silver jewellery always — bright and reflective, not brushed or oxidised',
    ],
  },
  'clear-winter': {
    // Cool + clear + vivid. Bridges Winter and Spring — the colours are bright
    // and saturated, not muted. Characteristic colours: hot pink, magenta, vivid
    // purple, electric blue, vivid green, clear red, bright turquoise, icy tones.
    best: [
      '#DA4A94', // Hot Pink — the Clear Winter signature
      '#BE74C9', // Vivid Lavender — clear bright purple-pink
      '#DA4E5F', // Vivid Rose-Red — clear cool red-pink
      '#FF0000', // True Red — vivid and clear
      '#FFFAFA', // Snow White — the clearest near-white
      '#191970', // Midnight Blue — deep vivid blue anchor
      '#0000CD', // Medium Blue — vivid electric blue
      '#00CED1', // Dark Turquoise — vivid clear teal
      '#00C853', // Vivid Green — clear bright green
      '#9400D3', // Dark Violet — vivid deep purple
      '#FF1493', // Deep Pink — vivid magenta-pink
      '#7B68EE', // Medium Slate Blue — clear vivid blue-purple
    ],
    avoid: [
      '#D2B48C', // Tan — too warm and muted
      '#BC8F5F', // Rosy brown — too warm
      '#F5DEB3', // Wheat — too warm and earthy
      '#DEB887', // Burlywood — too warm and muted
      '#8B7355', // Warm brown — too warm
      '#A0522D', // Sienna — too warm and earthy
    ],
    eyeEnhancing: ['#DA4A94', '#BE74C9', '#9400D3', '#0000CD'],
    skinAnalysis: 'Cool skin with a vivid, bright quality — the clearest of all Winters. High contrast with a luminous, almost electric quality to the complexion.',
    eyeAnalysis: 'Vivid, clear eyes — often very blue, very green, or very dark with high contrast. Most enhanced by magenta and electric blue, which echo the eye\'s vivid quality.',
    hairAnalysis: 'Dark cool hair — jet black or very dark cool brown, with a clear, vivid quality rather than a warm or muted one.',
    recommendation: 'You bridge Winter and Spring — you carry Winter\'s cool clarity with Spring\'s brightness. Magenta, hot pink, and electric blue are your signature. You are the most vivid of all seasons.',
    styleTips: [
      'Magenta and hot pink are your signature — wear them boldly near your face',
      'Vivid emerald and electric blue are equally powerful on you',
      'High-contrast colour blocking — hot pink with midnight blue — is your superpower',
      'Avoid any muted or earthy tone — they make you look washed out',
      'Polished, shiny silver jewellery only — as vivid and reflective as you are',
    ],
  },
}

// ─── Color description helpers ────────────────────────────────────────────────

function describeEyeColor(rgb: [number, number, number]): string {
  const [r, g, b] = rgb
  const [L, a, bVal] = rgbToLab(r, g, b)
  if (L < 22) return 'dark brown'
  if (bVal < -6 && L > 35) return 'blue'
  if (bVal < -2 && a < 0) return 'grey-blue'
  if (a < -5 && bVal > 0) return 'green'
  if (a < 0) return 'grey-green'
  if (L > 45 && a > 5) return 'hazel'
  return 'brown'
}

function describeHairColor(lab: [number, number, number]): string {
  const [L, , b] = lab
  if (L < 18) return b > 6 ? 'black' : 'blue-black'
  if (L < 33) return b > 6 ? 'very dark brown' : 'dark cool brown'
  if (L < 48) return b > 9 ? 'warm medium brown' : 'ash medium brown'
  if (L < 62) return b > 9 ? 'warm light brown' : 'ash light brown'
  if (L < 74) return b > 9 ? 'dark blonde' : 'ash blonde'
  return b > 6 ? 'golden blonde' : 'platinum blonde'
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export class FaceNotDetectedError extends Error {
  constructor() {
    super('face_not_detected')
    this.name = 'FaceNotDetectedError'
  }
}

export async function analyzeColorsInBrowser(
  imageData: string,
  knownUndertone?: 'warm' | 'cool'
): Promise<Omit<ColorAnalysis, 'id' | 'user_id' | 'created_at'>> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = imageData
  })

  const colors = await sampleColorsFromImage(img)

  if (!colors.faceDetected) {
    throw new FaceNotDetectedError()
  }

  const { subSeason, season, undertone, skinLab, hairLab } = classifySeason(colors, knownUndertone)
  const palette = SEASON_PALETTES[subSeason]

  const skinDesc = `Lab L=${Math.round(skinLab[0])}, b=${Math.round(skinLab[2])} — ${undertone} undertone`

  return {
    photo_url: '',
    season,
    sub_season: subSeason,
    skin_undertone: undertone,
    eye_color: describeEyeColor(colors.eye),
    hair_color: describeHairColor(hairLab),
    best_colors: palette.best,
    avoid_colors: palette.avoid,
    eye_enhancing_colors: palette.eyeEnhancing,
    analysis_details: {
      season_confidence: 68,
      skin_analysis: `${palette.skinAnalysis} (${skinDesc})`,
      eye_analysis: palette.eyeAnalysis,
      hair_analysis: `${palette.hairAnalysis} Detected: ${describeHairColor(hairLab)}.`,
      overall_recommendation: palette.recommendation,
      style_tips: palette.styleTips,
    },
  }
}

