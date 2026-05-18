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

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

function colorSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === 0) return 0
  return (max - min) / max
}

// ─── Canvas pixel sampling ───────────────────────────────────────────────────

function sampleRegion(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  skipDark = false
): [number, number, number] {
  const cx = Math.max(0, Math.round(x))
  const cy = Math.max(0, Math.round(y))
  const cw = Math.max(1, Math.round(w))
  const ch = Math.max(1, Math.round(h))

  const data = ctx.getImageData(cx, cy, cw, ch).data
  let r = 0, g = 0, b = 0, count = 0

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (alpha < 128) continue
    if (skipDark && brightness < 20) continue  // skip near-black pixels (background)
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
  }

  if (count === 0) return [128, 100, 90]
  return [r / count, g / count, b / count]
}

// ─── Face detection + region sampling ────────────────────────────────────────

interface SampledColors {
  skin: [number, number, number]
  hair: [number, number, number]
  eye: [number, number, number]
}

async function loadFaceApi() {
  const faceapi = await import('face-api.js')
  const MODEL_URL = '/models'
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ])
  return faceapi
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
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
      .withFaceLandmarks(true)

    if (detection) {
      const { box } = detection.detection
      const landmarks = detection.landmarks.positions

      // Skin: cheek points (landmarks 1,3,5,11,13,15) — average region around each
      const cheekIdxs = [1, 3, 5, 11, 13, 15]
      const skinSamples = cheekIdxs.map(i => {
        const pt = landmarks[i]
        return sampleRegion(ctx, pt.x - 8, pt.y - 8, 16, 16)
      })
      const skin: [number, number, number] = [
        skinSamples.reduce((s, c) => s + c[0], 0) / skinSamples.length,
        skinSamples.reduce((s, c) => s + c[1], 0) / skinSamples.length,
        skinSamples.reduce((s, c) => s + c[2], 0) / skinSamples.length,
      ]

      // Hair: region above face bounding box
      const hairY = Math.max(0, box.y - box.height * 0.3)
      const hair = sampleRegion(ctx, box.x + box.width * 0.2, hairY, box.width * 0.6, box.height * 0.3, true)

      // Eyes: outer corners (landmarks 36, 39, 42, 45)
      const eyeIdxs = [36, 39, 42, 45]
      const eyeSamples = eyeIdxs.map(i => {
        const pt = landmarks[i]
        return sampleRegion(ctx, pt.x - 5, pt.y - 5, 10, 10)
      })
      const eye: [number, number, number] = [
        eyeSamples.reduce((s, c) => s + c[0], 0) / eyeSamples.length,
        eyeSamples.reduce((s, c) => s + c[1], 0) / eyeSamples.length,
        eyeSamples.reduce((s, c) => s + c[2], 0) / eyeSamples.length,
      ]

      return { skin, hair, eye }
    }
  } catch {
    // face-api failed — fall through to heuristic sampling
  }

  // Heuristic fallback: assume face is centered
  const skin = sampleRegion(ctx, W * 0.35, H * 0.35, W * 0.3, H * 0.25)
  const hair = sampleRegion(ctx, W * 0.2, H * 0.05, W * 0.6, H * 0.2, true)
  const eye = sampleRegion(ctx, W * 0.3, H * 0.33, W * 0.4, H * 0.1)

  return { skin, hair, eye }
}

// ─── Season classification ────────────────────────────────────────────────────

function classifySeason(colors: SampledColors): {
  subSeason: SubSeason
  season: Season
  undertone: SkinUndertone
  skinLab: [number, number, number]
  hairLab: [number, number, number]
} {
  const skinLab = rgbToLab(...colors.skin)
  const hairLab = rgbToLab(...colors.hair)
  const eyeLab = rgbToLab(...colors.eye)

  const [skinL, , skinB] = skinLab
  const [hairL, , hairB] = hairLab
  const [eyeL] = eyeLab

  // Skin saturation = chroma indicator
  const skinSat = colorSaturation(...colors.skin)

  // Step 1 — Temperature
  const tiebreaker = hairB
  let isWarm: boolean
  if (skinB > 8) {
    isWarm = true
  } else if (skinB < 2) {
    isWarm = false
  } else {
    isWarm = tiebreaker > 5
  }

  // Step 2 — Value
  const isLight = skinL > 65
  const isDark = skinL < 45

  // Step 3 — Chroma
  const isBright = skinSat > 0.25
  const isMuted = skinSat < 0.12

  // Step 4 — Hair reinforcement
  const hairIsDark = hairL < 40

  // Step 5 — Eye contrast
  const eyeContrast = Math.abs(skinL - eyeL) > 40

  // Determine undertone for display
  const undertone: SkinUndertone = skinB > 8 ? 'warm' : skinB < 2 ? 'cool' : 'neutral'

  let subSeason: SubSeason
  let season: Season

  if (isWarm) {
    if (isLight) {
      subSeason = 'light-spring'; season = 'spring'
    } else if (isBright && !hairIsDark) {
      subSeason = 'true-spring'; season = 'spring'
    } else if (isBright && hairIsDark) {
      subSeason = 'warm-spring'; season = 'spring'
    } else if (isMuted && !hairIsDark) {
      subSeason = 'soft-autumn'; season = 'autumn'
    } else if (isDark || (hairIsDark && !isBright)) {
      subSeason = 'dark-autumn'; season = 'autumn'
    } else {
      subSeason = 'true-autumn'; season = 'autumn'
    }
  } else {
    if (isLight) {
      subSeason = 'light-summer'; season = 'summer'
    } else if (isMuted && !hairIsDark) {
      subSeason = 'soft-summer'; season = 'summer'
    } else if (isMuted && hairIsDark) {
      subSeason = 'soft-summer'; season = 'summer'
    } else if (isBright && eyeContrast) {
      subSeason = 'clear-winter'; season = 'winter'
    } else if (isDark || hairIsDark) {
      subSeason = eyeContrast ? 'dark-winter' : 'dark-winter'; season = 'winter'
    } else if (!isMuted && eyeContrast) {
      subSeason = 'true-winter'; season = 'winter'
    } else {
      subSeason = 'true-summer'; season = 'summer'
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
    best: ['#E3A274','#ECA299','#F5D4C0','#A8D8C4','#F5E6D8','#F9EBD0','#D4EAD8','#C8E8E0','#FDDDB3','#E8C4B8','#B8DDD4','#F2E4D8'],
    avoid: ['#0D0D0D','#F5F5F5','#1A237E','#36454F','#333333','#008000'],
    eyeEnhancing: ['#A8D8C4','#C8E8E0','#88C8B4','#B8D8D0'],
    skinAnalysis: 'Light, delicate skin with warm peachy-golden undertones. The skin has a soft, luminous quality typical of Light Spring.',
    eyeAnalysis: 'Eyes have a soft, clear quality — light to medium in depth with warm undertones. They sparkle most against warm mint and soft coral tones.',
    hairAnalysis: 'Light to medium hair with golden or warm blonde highlights. Natural highlights catch the light beautifully.',
    recommendation: 'Your palette is sun-warmed and delicate. Wear peach, soft coral, and warm mint close to your face. Avoid stark black or white — reach for warm brown and ivory instead.',
    styleTips: [
      'Replace black with warm chocolate brown or dark camel for a more harmonious look',
      'Opt for ivory and cream instead of stark white',
      'Try delicate florals and watercolour prints in your colour range',
      'Gold and rose gold jewellery will enhance your warm undertones',
      'Layer apricot and warm mint for a fresh, put-together look',
    ],
  },
  'true-spring': {
    best: ['#F9C74F','#FFC857','#F3722C','#F7B567','#C68642','#FFB347','#E8A830','#F4A460','#DEB887','#CD853F','#D4AF37','#FF8C00'],
    avoid: ['#6A5ACD','#4169E1','#778899','#B0C4DE','#696969','#2F4F4F'],
    eyeEnhancing: ['#F3722C','#E8963C','#D4AF37','#C68642'],
    skinAnalysis: 'Warm golden skin with clear, bright undertones. The skin has a healthy sun-kissed glow typical of True Spring.',
    eyeAnalysis: 'Warm, clear eyes — green, hazel, or warm brown. They come alive against golden yellow and warm coral tones.',
    hairAnalysis: 'Golden, warm-toned hair — blonde, strawberry, or warm brown. Natural warmth is a defining feature.',
    recommendation: 'Your colours are sunny and vibrant. Wear golden yellows and warm corals to amplify your natural glow. Avoid cool blues and greys which will dull your complexion.',
    styleTips: [
      'Turquoise and aqua are your power colours — try a warm-tinted turquoise blouse',
      'Warm coral and peach make your skin glow — perfect for date nights',
      'Camel is your ideal neutral — it works where others might reach for beige',
      'Avoid cool-toned silver; yellow gold and brass are your metals',
      'Tropical prints in your warm colour family are made for you',
    ],
  },
  'warm-spring': {
    best: ['#F9C74F','#FFC857','#F7B567','#E8963C','#D4AF37','#C68642','#DEB887','#CD853F','#DAA520','#B8860B','#D2691E','#8B6914'],
    avoid: ['#708090','#B0C4DE','#4169E1','#6A5ACD','#2F4F4F','#1C1C1C'],
    eyeEnhancing: ['#DAA520','#C68642','#D4AF37','#B8860B'],
    skinAnalysis: 'Rich warm skin with golden-amber undertones — bridging Spring into Autumn territory. Deep and glowing.',
    eyeAnalysis: 'Deep warm eyes — hazel, amber, or warm dark brown with golden flecks. Most enhanced by rich golds and warm ambers.',
    hairAnalysis: 'Medium to dark warm hair with golden or auburn tones. Rich and warm with natural depth.',
    recommendation: 'Your palette bridges warm Spring and Autumn. Reach for rich golds, warm camel, and earthy amber. Your depth means you can carry deeper shades than lighter Springs.',
    styleTips: [
      'You can wear richer, deeper versions of Spring colours — try deep coral instead of pale peach',
      'Camel and warm tan are perfect neutrals for you',
      'Yellow gold jewellery is essential — avoid silver entirely',
      'Warm brown replaces black perfectly in your wardrobe',
      'Layer warm amber tones for a rich, put-together look',
    ],
  },
  'light-summer': {
    best: ['#A4C1F3','#BDA7DD','#C8B4D0','#99CCEE','#B0C8E8','#D4C8E8','#C4D8F0','#E8C8D8','#C8D8E8','#D0C8E0','#B8D0E8','#DDD4EC'],
    avoid: ['#FF8C00','#DAA520','#8B6914','#D2691E','#A52A2A','#8B4513'],
    eyeEnhancing: ['#A4C1F3','#B8D4F0','#9BB8E8','#C0D4F4'],
    skinAnalysis: 'Light, delicate skin with cool pink undertones. The skin has a soft porcelain quality — luminous and ethereal.',
    eyeAnalysis: 'Light, soft eyes — pale blue, grey, or light green. They are most enhanced by soft powder blues and cool lavenders.',
    hairAnalysis: 'Light to medium cool-toned hair — ash blonde, light brown, or grey. Natural coolness is characteristic.',
    recommendation: 'Your palette is soft and cool. Powder blue, lavender, and misty rose are your best friends. Avoid warm orange and golden tones which clash with your cool undertones.',
    styleTips: [
      'Soft powder blue is almost a neutral for you — it goes with everything',
      'Layering cool tones (lavender + powder blue) creates an effortlessly chic look',
      'Silver and white gold are your metals — avoid yellow gold',
      'Watercolour prints and soft florals in your colour range are ideal',
      'Dove grey replaces black beautifully in your wardrobe',
    ],
  },
  'true-summer': {
    best: ['#CED6E0','#A6B8D2','#6F96A2','#92ADAF','#D6C7D9','#BDAECF','#E4C4CA','#8BA8C0','#9BB4CC','#C4B8D4','#7898B4','#B4C8D8'],
    avoid: ['#FF8C00','#DAA520','#D2691E','#8B4513','#A52A2A','#FF4500'],
    eyeEnhancing: ['#6F96A2','#7898B4','#8BA8C0','#92ADAF'],
    skinAnalysis: 'Medium cool skin with rose or blue-pink undertones. The skin has a refined, elegant coolness typical of True Summer.',
    eyeAnalysis: 'Soft, cool eyes — grey-blue, grey-green, or cool grey. They are enhanced most by ocean slate and cool teal tones.',
    hairAnalysis: 'Medium to dark cool-toned hair — ash brown, medium grey, or cool dark blonde. Refined and muted in character.',
    recommendation: 'Your palette is cool and muted with quiet sophistication. Wear ocean slate, bluebell haze, and soft lavender. The Scandinavian aesthetic suits you perfectly.',
    styleTips: [
      'Monochromatic cool tones create a polished, put-together look',
      'Navy is your power neutral — it replaces black beautifully',
      'Silver jewellery only — yellow gold creates dissonance',
      'Soft watercolour prints in your cool palette are ideal',
      'Muted rose and dusty blue are your signature tones',
    ],
  },
  'soft-summer': {
    best: ['#7598C4','#78ABC6','#998CBD','#C4A0A8','#A8B8C8','#B8A8C8','#C0B0C0','#8C9CB8','#A4AABC','#B4B0C4','#98A8BC','#C8BCC8'],
    avoid: ['#FF6600','#FFD700','#FF4500','#DC143C','#8B0000','#006400'],
    eyeEnhancing: ['#7598C4','#8DAAD0','#6A8AB8','#7890BC'],
    skinAnalysis: 'Neutral-cool skin with a greyed, muted quality. The skin has soft undertones that bridge Summer and Autumn.',
    eyeAnalysis: 'Soft, muted eyes with a grey-toned quality — grey-green, grey-blue, or muted hazel. Enhanced by dusty blues and muted lavenders.',
    hairAnalysis: 'Medium cool-to-neutral hair — often ashy, muted brown, or warm grey. Has a soft, undramatic quality.',
    recommendation: 'Your palette is muted and sophisticated. Think dusty blue, soft mauve, and grey-purple. Avoid pure black and bright vivid tones which overwhelm your subtle colouring.',
    styleTips: [
      'Greyed-out tones are your superpower — dusty blue, muted mauve, sage grey',
      'Avoid bright, saturated colours — choose their muted, dusty versions instead',
      'Charcoal grey is a better choice than true black',
      'Tone-on-tone looks in greyed tones are very chic on you',
      'Brushed silver or satin/matte metal jewellery suits you perfectly',
    ],
  },
  'soft-autumn': {
    best: ['#9CAF88','#BDBFA0','#D9927A','#D9A6A6','#B8A99A','#D1B7A3','#C48793','#D2B48C','#D99058','#C8A888','#B8987A','#D4B898'],
    avoid: ['#9400D3','#4B0082','#0000FF','#4169E1','#B0E0E6','#00FFFF'],
    eyeEnhancing: ['#D9927A','#C8A070','#B89068','#C4987A'],
    skinAnalysis: 'Warm-neutral skin with soft, muted golden undertones. The skin has a natural, earthy warmth that is gentle rather than vivid.',
    eyeAnalysis: 'Soft warm eyes — hazel, soft brown, or muted green. They glow most against terracotta and muted peach tones.',
    hairAnalysis: 'Medium warm hair — often mousy brown, warm ash, or soft golden brown. Naturally understated.',
    recommendation: 'Your palette is the most wearable of all seasons — soft, warm, and earthy. Muted terracotta, soft olive, and warm taupe are your foundation. Avoid bright vivid tones.',
    styleTips: [
      'Soft olive and sage green are perfect for everyday wear',
      'Replace black with warm chocolate or dark brown',
      'Replace white with warm cream or oyster',
      'Hammered gold or matte bronze jewellery suits you',
      'Earthy patterns — subtle florals, soft paisley — in your palette are ideal',
    ],
  },
  'true-autumn': {
    best: ['#CC5500','#B7410E','#DAA520','#708238','#800020','#6B3A2A','#D4A017','#8B4513','#CD853F','#A0522D','#556B2F','#8B6914'],
    avoid: ['#FF69B4','#00BFFF','#E0E0E0','#D3D3D3','#C0C0C0','#F0F8FF'],
    eyeEnhancing: ['#CC5500','#B87333','#A05000','#8B6914'],
    skinAnalysis: 'Rich warm skin with golden-amber or olive undertones. The skin is deep and earthy — the purest expression of Autumn warmth.',
    eyeAnalysis: 'Warm, rich eyes — deep hazel, amber, warm dark brown, or olive green. They ignite against burnt orange and forest green.',
    hairAnalysis: 'Rich warm hair — auburn, warm chestnut, copper, or warm dark brown. Deep and earthy with no ashy quality.',
    recommendation: 'You are the quintessential Autumn. Burnt orange, rust, and mustard are your signature colours. Wear nature\'s richest palette — earthy, warm, and deep.',
    styleTips: [
      'Burnt orange is your signature colour — wear it proudly',
      'Olive green is a perfect everyday neutral',
      'Dark chocolate brown replaces black for a richer, more harmonious look',
      'Bronze, brass, and copper jewellery are your metals',
      'Tweed, corduroy, and suede textures in earthy tones are perfect for you',
    ],
  },
  'dark-autumn': {
    best: ['#924819','#954344','#4A1B1F','#404C24','#675100','#005F6B','#8A3324','#800000','#556B2F','#8B4513','#5C4033','#704214'],
    avoid: ['#FFB6C1','#E6E6FA','#B0E0E6','#87CEEB','#F0F8FF','#FFFACD'],
    eyeEnhancing: ['#924819','#8B4513','#A0522D','#704214'],
    skinAnalysis: 'Deep warm skin with rich amber, olive, or bronze undertones. The skin is the most intense of the Autumn family — powerful and dramatic.',
    eyeAnalysis: 'Deep, rich eyes — dark brown, deep amber, or very dark hazel with little visible light. They command attention and suit deep, rich accent colours.',
    hairAnalysis: 'Very dark warm hair — deep chocolate, dark auburn, or near-black with warm undertones. Intense and rich.',
    recommendation: 'Your palette is dramatic and moody-luxe. Deep burgundy, army green, and dark chocolate are your anchors. Avoid pale pastels entirely — you need rich, saturated depth.',
    styleTips: [
      'Deep burgundy and wine tones are your power colours',
      'Army green and dark olive make you look authoritative',
      'Very dark chocolate brown works where others use black',
      'Velvet and suede textures in dark rich tones are excellent',
      'Antiqued bronze and oxidised gold jewellery complements your depth',
    ],
  },
  'dark-winter': {
    best: ['#0D0F1A','#003153','#015871','#00491E','#7D1B4D','#5F2566','#7A1F3D','#64242E','#1D2327','#191970','#003366','#2C0040'],
    avoid: ['#DAA520','#FF8C00','#D2691E','#8B4513','#C8A000','#A0522D'],
    eyeEnhancing: ['#003153','#015871','#191970','#003366'],
    skinAnalysis: 'Deep cool-neutral skin with intense undertones — the darkest of all seasons. Can range from deep porcelain to very deep ebony, all with cool depth.',
    eyeAnalysis: 'Very dark, deep eyes with high contrast against the skin. They are powerful and most enhanced by Prussian blue and deep teal.',
    hairAnalysis: 'Very dark to black hair — jet black, very dark brown, or dark with cool undertones. Intense and dramatic.',
    recommendation: 'You carry the most dramatic palette. Deep navy, jewel tones, and true black are your foundation. Avoid warm earthy tones entirely — cool, dark, and rich is your aesthetic.',
    styleTips: [
      'Head-to-toe deep navy with a single jewel-tone accent is very powerful',
      'Deep teal and sapphire blue are transformative for you',
      'True black is perfect on you — one of the few seasons that wears it naturally',
      'Silver jewellery only — white gold or platinum preferred',
      'High-contrast combinations work beautifully on your colouring',
    ],
  },
  'true-winter': {
    best: ['#000000','#FFFFFF','#003087','#003366','#CC0000','#9B111E','#FF00FF','#E91E8C','#800080','#4B0082','#A9A9A9','#C0C0C0'],
    avoid: ['#DAA520','#D2691E','#8B4513','#F5DEB3','#DEB887','#BC8F5F'],
    eyeEnhancing: ['#003087','#003366','#006400','#800080'],
    skinAnalysis: 'Clear cool skin with high contrast features. The skin is either porcelain-fair or very deep, with blue-pink or cool olive undertones.',
    eyeAnalysis: 'Clear, vivid eyes — often dark brown, black, bright blue, or cool green with high contrast against the whites. Most dramatic with cobalt blue and ruby red.',
    hairAnalysis: 'Dark cool hair — jet black, very dark brown, or dark cool brown. High contrast with skin is the defining feature.',
    recommendation: 'You are the most dramatic season. Pure black and white, cobalt blue, and true red are your colours. You can wear colours no other season can. Avoid anything muted or warm.',
    styleTips: [
      'Black and white is your signature — you make it look editorial',
      'Cobalt and royal blue are transformative on you',
      'True red and ruby red are your power colours',
      'Avoid earth tones — they dull your natural high contrast',
      'Silver jewellery always — polished and bright, never matte or antique',
    ],
  },
  'clear-winter': {
    best: ['#DA4A94','#BE74C9','#DA4E5F','#FF0000','#FFFAFA','#191970','#0000CD','#00CED1','#00FF00','#9400D3','#FF1493','#7B68EE'],
    avoid: ['#D2B48C','#BC8F5F','#F5DEB3','#DEB887','#8B7355','#A0522D'],
    eyeEnhancing: ['#DA4A94','#BE74C9','#9400D3','#7B68EE'],
    skinAnalysis: 'Cool skin with bright, vivid quality — the clearest of all Winters. High contrast and luminous with cool undertones.',
    eyeAnalysis: 'Vivid, clear eyes with high contrast — often bright blue, clear green, or vivid dark brown. Most enhanced by magenta and electric blue.',
    hairAnalysis: 'Dark cool hair with a vivid, clear quality. Often dark brown or black with no warmth or ashiness.',
    recommendation: 'You bridge Winter and Spring with the highest chroma of all Winters. Magenta, hot pink, and electric blue are your signature tones. You can wear the most saturated colours.',
    styleTips: [
      'Magenta and hot pink are your signature — wear them boldly',
      'Vivid emerald green and electric blue look stunning on you',
      'High-contrast colour blocking is your styling superpower',
      'Shiny, polished silver jewellery enhances your natural clarity',
      'Animal prints in black and white are made for your colouring',
    ],
  },
}

// ─── Color name helpers ───────────────────────────────────────────────────────

function describeColor(lab: [number, number, number]): string {
  const [L, a, b] = lab
  const lightness = L > 70 ? 'light' : L > 50 ? 'medium' : L > 30 ? 'deep' : 'very dark'
  const warmth = b > 8 ? 'warm' : b < 2 ? 'cool' : 'neutral'
  const saturation = Math.sqrt(a * a + b * b) > 20 ? 'vibrant' : 'soft'
  return `${lightness} ${warmth} ${saturation}`
}

function describeEyeColor(rgb: [number, number, number]): string {
  const [r, g, b] = rgb
  const lab = rgbToLab(r, g, b)
  const [L, a, bVal] = lab

  if (L < 25) return 'dark brown'
  if (bVal < -5 && L > 40) return 'blue'
  if (bVal < 0 && a < 0) return 'grey-blue'
  if (a < -5 && bVal > 0) return 'green'
  if (a < 0) return 'grey-green'
  if (L > 50 && a > 5) return 'hazel'
  return 'brown'
}

function describeHairColor(lab: [number, number, number]): string {
  const [L, , b] = lab
  if (L < 20) return b > 5 ? 'black' : 'blue-black'
  if (L < 35) return b > 5 ? 'very dark brown' : 'dark cool brown'
  if (L < 50) return b > 8 ? 'warm medium brown' : 'ash medium brown'
  if (L < 65) return b > 8 ? 'warm light brown' : 'ash light brown'
  if (L < 75) return b > 8 ? 'dark blonde' : 'ash blonde'
  return b > 5 ? 'golden blonde' : 'platinum blonde'
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function analyzeColorsInBrowser(imageData: string): Promise<Omit<ColorAnalysis, 'id' | 'user_id' | 'created_at'>> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = imageData
  })

  const colors = await sampleColorsFromImage(img)
  const { subSeason, season, undertone, skinLab, hairLab } = classifySeason(colors)

  const palette = SEASON_PALETTES[subSeason]

  return {
    photo_url: '', // caller decides whether to store the photo
    season,
    sub_season: subSeason,
    skin_undertone: undertone,
    eye_color: describeEyeColor(colors.eye),
    hair_color: describeHairColor(hairLab),
    best_colors: palette.best,
    avoid_colors: palette.avoid,
    eye_enhancing_colors: palette.eyeEnhancing,
    analysis_details: {
      season_confidence: 72,
      skin_analysis: `${palette.skinAnalysis} Lab values: L=${Math.round(skinLab[0])}, b=${Math.round(skinLab[2])} (${describeColor(skinLab)} skin tone).`,
      eye_analysis: palette.eyeAnalysis,
      hair_analysis: `${palette.hairAnalysis} Hair tone: ${describeHairColor(hairLab)}.`,
      overall_recommendation: palette.recommendation,
      style_tips: palette.styleTips,
    },
  }
}
