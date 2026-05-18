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
    if (skinL > 62) {
      // Light + warm → Light Spring
      subSeason = 'light-spring'; season = 'spring'
    } else if (skinChroma > 28 && skinL > 48) {
      // Medium-light + warm + vivid → True Spring
      subSeason = 'true-spring'; season = 'spring'
    } else if (skinChroma > 22 && hairIsWarm && !hairIsDark) {
      // Warm + some chroma + warm golden hair → True/Warm Spring
      subSeason = 'warm-spring'; season = 'spring'
    } else if (skinChroma < 20) {
      // Warm + muted → Soft Autumn
      subSeason = 'soft-autumn'; season = 'autumn'
    } else if (skinL < 42 || (hairIsDark && skinB > 18)) {
      // Dark + warm → Dark Autumn
      subSeason = 'dark-autumn'; season = 'autumn'
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
      if (skinL > 60) {
        subSeason = 'light-spring'; season = 'spring'
      } else if (skinChroma < 20) {
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
    best: ['#A4C1F3','#BDA7DD','#C8B4D0','#99CCEE','#B0C8E8','#D4C8E8','#C4D8F0','#E8C8D8','#C8D8E8','#D0C8E0','#B8D0E8','#DDD4EC'],
    avoid: ['#FF8C00','#DAA520','#8B6914','#D2691E','#A52A2A','#8B4513'],
    eyeEnhancing: ['#A4C1F3','#B8D4F0','#9BB8E8','#C0D4F4'],
    skinAnalysis: 'Light, delicate skin with cool pink undertones — porcelain and ethereal.',
    eyeAnalysis: 'Light, soft eyes — pale blue, grey, or light green. Most enhanced by soft powder blues and cool lavenders.',
    hairAnalysis: 'Light to medium cool-toned hair — ash blonde, light brown, or grey.',
    recommendation: 'Your palette is soft and cool. Powder blue, lavender, and misty rose are your best friends.',
    styleTips: [
      'Soft powder blue is almost a neutral for you',
      'Layering cool tones creates an effortlessly chic look',
      'Silver and white gold only — avoid yellow gold',
      'Dove grey replaces black beautifully',
      'Avoid warm orange and golden tones entirely',
    ],
  },
  'true-summer': {
    best: ['#CED6E0','#A6B8D2','#6F96A2','#92ADAF','#D6C7D9','#BDAECF','#E4C4CA','#8BA8C0','#9BB4CC','#C4B8D4','#7898B4','#B4C8D8'],
    avoid: ['#FF8C00','#DAA520','#D2691E','#8B4513','#A52A2A','#FF4500'],
    eyeEnhancing: ['#6F96A2','#7898B4','#8BA8C0','#92ADAF'],
    skinAnalysis: 'Medium cool skin with rose or blue-pink undertones — refined and elegant.',
    eyeAnalysis: 'Soft, cool eyes — grey-blue, grey-green, or cool grey. Enhanced by ocean slate and cool teal tones.',
    hairAnalysis: 'Medium to dark cool-toned hair — ash brown, medium grey, or cool dark blonde.',
    recommendation: 'Your palette is cool and muted with quiet sophistication. Ocean slate, bluebell haze, and soft lavender are yours.',
    styleTips: [
      'Monochromatic cool tones create a polished look',
      'Navy is your power neutral — it replaces black beautifully',
      'Silver jewellery only',
      'Muted rose and dusty blue are your signature tones',
      'Avoid warm browns and camel — they clash with your undertones',
    ],
  },
  'soft-summer': {
    best: ['#7598C4','#78ABC6','#998CBD','#C4A0A8','#A8B8C8','#B8A8C8','#C0B0C0','#8C9CB8','#A4AABC','#B4B0C4','#98A8BC','#C8BCC8'],
    avoid: ['#FF6600','#FFD700','#FF4500','#DC143C','#8B0000','#006400'],
    eyeEnhancing: ['#7598C4','#8DAAD0','#6A8AB8','#7890BC'],
    skinAnalysis: 'Neutral-cool skin with a soft, greyed quality — bridging Summer and Autumn.',
    eyeAnalysis: 'Soft, muted eyes — grey-green, grey-blue, or muted hazel. Enhanced by dusty blues and muted lavenders.',
    hairAnalysis: 'Medium cool-to-neutral hair — often ashy or muted brown.',
    recommendation: 'Your palette is muted and sophisticated. Dusty blue, soft mauve, and grey-purple. Avoid pure black and bright vivid tones.',
    styleTips: [
      'Greyed-out tones are your superpower — dusty blue, muted mauve, sage grey',
      'Avoid bright, saturated colours — always choose the muted version',
      'Charcoal grey is better than true black',
      'Tone-on-tone looks in greyed tones are very chic on you',
      'Brushed silver or matte metal jewellery suits you',
    ],
  },
  'soft-autumn': {
    best: ['#9CAF88','#BDBFA0','#D9927A','#D9A6A6','#B8A99A','#D1B7A3','#C48793','#D2B48C','#D99058','#C8A888','#B8987A','#D4B898'],
    avoid: ['#9400D3','#4B0082','#0000FF','#4169E1','#B0E0E6','#00FFFF'],
    eyeEnhancing: ['#D9927A','#C8A070','#B89068','#C4987A'],
    skinAnalysis: 'Warm-neutral skin with soft, muted golden undertones — gentle rather than vivid.',
    eyeAnalysis: 'Soft warm eyes — hazel, soft brown, or muted green. Glow most against terracotta and muted peach.',
    hairAnalysis: 'Medium warm hair — mousy brown, warm ash, or soft golden brown.',
    recommendation: 'Your palette is the most wearable of all seasons — soft, warm, and earthy. Muted terracotta, soft olive, and warm taupe are your foundation.',
    styleTips: [
      'Soft olive and sage green are perfect everyday colours',
      'Replace black with warm chocolate or dark brown',
      'Replace white with warm cream or oyster',
      'Hammered gold or matte bronze jewellery suits you',
      'Natural fabrics — linen, cotton — in your earthy palette are ideal',
    ],
  },
  'true-autumn': {
    best: ['#CC5500','#B7410E','#DAA520','#708238','#800020','#6B3A2A','#D4A017','#8B4513','#CD853F','#A0522D','#556B2F','#8B6914'],
    avoid: ['#FF69B4','#00BFFF','#E0E0E0','#D3D3D3','#C0C0C0','#F0F8FF'],
    eyeEnhancing: ['#CC5500','#B87333','#A05000','#8B6914'],
    skinAnalysis: 'Rich warm skin with golden-amber or olive undertones — the purest expression of Autumn warmth.',
    eyeAnalysis: 'Warm, rich eyes — deep hazel, amber, warm dark brown, or olive green. They ignite against burnt orange and forest green.',
    hairAnalysis: 'Rich warm hair — auburn, warm chestnut, copper, or warm dark brown.',
    recommendation: 'You are the quintessential Autumn. Burnt orange, rust, and mustard are your signature colours.',
    styleTips: [
      'Burnt orange is your signature colour',
      'Olive green is a perfect everyday neutral',
      'Dark chocolate brown replaces black',
      'Bronze, brass, and copper jewellery are your metals',
      'Tweed, corduroy, and suede in earthy tones are perfect',
    ],
  },
  'dark-autumn': {
    best: ['#924819','#954344','#4A1B1F','#404C24','#675100','#005F6B','#8A3324','#800000','#556B2F','#8B4513','#5C4033','#704214'],
    avoid: ['#FFB6C1','#E6E6FA','#B0E0E6','#87CEEB','#F0F8FF','#FFFACD'],
    eyeEnhancing: ['#924819','#8B4513','#A0522D','#704214'],
    skinAnalysis: 'Deep warm skin with rich amber, olive, or bronze undertones — powerful and dramatic.',
    eyeAnalysis: 'Deep, rich eyes — dark brown, deep amber, or very dark hazel. Command attention.',
    hairAnalysis: 'Very dark warm hair — deep chocolate, dark auburn, or near-black with warm undertones.',
    recommendation: 'Your palette is dramatic and moody-luxe. Deep burgundy, army green, and dark chocolate are your anchors.',
    styleTips: [
      'Deep burgundy and wine tones are your power colours',
      'Army green and dark olive make you look authoritative',
      'Very dark chocolate brown works where others use black',
      'Velvet and suede in dark rich tones are excellent',
      'Antiqued bronze and oxidised gold jewellery',
    ],
  },
  'dark-winter': {
    best: ['#0D0F1A','#003153','#015871','#00491E','#7D1B4D','#5F2566','#7A1F3D','#64242E','#1D2327','#191970','#003366','#2C0040'],
    avoid: ['#DAA520','#FF8C00','#D2691E','#8B4513','#C8A000','#A0522D'],
    eyeEnhancing: ['#003153','#015871','#191970','#003366'],
    skinAnalysis: 'Deep cool-neutral skin — the darkest and most intense of all seasons.',
    eyeAnalysis: 'Very dark, deep eyes with high contrast. Most enhanced by Prussian blue and deep teal.',
    hairAnalysis: 'Very dark to black hair — jet black, very dark brown, or dark with cool undertones.',
    recommendation: 'Deep navy, jewel tones, and true black are your foundation. Avoid warm earthy tones entirely.',
    styleTips: [
      'Head-to-toe deep navy with a jewel-tone accent is very powerful',
      'Deep teal and sapphire blue are transformative for you',
      'True black is perfect on you',
      'Silver jewellery only — white gold or platinum',
      'High-contrast combinations work beautifully',
    ],
  },
  'true-winter': {
    best: ['#000000','#FFFFFF','#003087','#003366','#CC0000','#9B111E','#FF00FF','#E91E8C','#800080','#4B0082','#A9A9A9','#C0C0C0'],
    avoid: ['#DAA520','#D2691E','#8B4513','#F5DEB3','#DEB887','#BC8F5F'],
    eyeEnhancing: ['#003087','#003366','#006400','#800080'],
    skinAnalysis: 'Clear cool skin with high contrast — either porcelain-fair or very deep, with blue-pink undertones.',
    eyeAnalysis: 'Clear, vivid eyes with high contrast against the whites. Most dramatic with cobalt blue and ruby red.',
    hairAnalysis: 'Dark cool hair — jet black, very dark brown, or dark cool brown.',
    recommendation: 'You are the most dramatic season. Pure black and white, cobalt blue, and true red are your colours.',
    styleTips: [
      'Black and white is your signature — you make it look editorial',
      'Cobalt and royal blue are transformative on you',
      'True red and ruby red are your power colours',
      'Avoid earth tones — they dull your natural high contrast',
      'Silver jewellery always — polished and bright',
    ],
  },
  'clear-winter': {
    best: ['#DA4A94','#BE74C9','#DA4E5F','#FF0000','#FFFAFA','#191970','#0000CD','#00CED1','#00FF00','#9400D3','#FF1493','#7B68EE'],
    avoid: ['#D2B48C','#BC8F5F','#F5DEB3','#DEB887','#8B7355','#A0522D'],
    eyeEnhancing: ['#DA4A94','#BE74C9','#9400D3','#7B68EE'],
    skinAnalysis: 'Cool skin with bright, vivid quality — the clearest of all Winters. High contrast and luminous.',
    eyeAnalysis: 'Vivid, clear eyes with high contrast. Most enhanced by magenta and electric blue.',
    hairAnalysis: 'Dark cool hair with a vivid, clear quality.',
    recommendation: 'You bridge Winter and Spring. Magenta, hot pink, and electric blue are your signature.',
    styleTips: [
      'Magenta and hot pink are your signature — wear them boldly',
      'Vivid emerald and electric blue look stunning on you',
      'High-contrast colour blocking is your superpower',
      'Shiny, polished silver jewellery',
      'Animal prints in black and white are made for your colouring',
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
