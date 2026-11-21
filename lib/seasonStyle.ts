import type { SubSeason } from './types'

export interface StyleGuide {
  fits: string[]          // e.g. "Slim fit", "Relaxed fit"
  fitAdvice: string       // one-sentence summary
  fabrics: string[]       // e.g. "Cotton", "Linen"
  fabricAdvice: string    // one-sentence summary
  avoid: string[]         // fits/fabrics to avoid
  outfitFormula: string   // a simple go-to formula
}

const STYLE_GUIDES: Record<SubSeason, StyleGuide> = {
  'light-spring': {
    fits: ['Slim fit', 'Relaxed slim', 'Tailored (not stiff)'],
    fitAdvice: 'Go for clothes that follow your shape without being tight — relaxed slim is your sweet spot. Avoid anything boxy or oversized as it will overwhelm your delicate colouring.',
    fabrics: ['Cotton', 'Linen', 'Light chambray', 'Soft jersey', 'Light chiffon'],
    fabricAdvice: 'Stick to light, natural fabrics with soft texture. Linen and cotton in warm tones are your best friends — they suit your warm, airy quality.',
    avoid: ['Heavy wool', 'Thick leather', 'Dark denim (black/indigo)', 'Stiff suiting fabric', 'Shiny polyester'],
    outfitFormula: 'Ivory linen shirt + camel chino + white canvas trainers — effortless and perfectly balanced for your palette.',
  },
  'true-spring': {
    fits: ['Slim fit', 'Tailored', 'Athletic fit'],
    fitAdvice: 'You carry structure well. Slim and tailored cuts show off your warm, vivid colouring. Avoid baggy silhouettes — they mute your natural energy.',
    fabrics: ['Cotton', 'Linen', 'Light wool', 'Jersey knit'],
    fabricAdvice: 'Natural fabrics in clear, warm tones. Light wool blazers work well for you — just keep colours warm and avoid grey.',
    avoid: ['Oversized fits', 'Shapeless knitwear', 'Cold-toned grey wool', 'Heavy denim'],
    outfitFormula: 'Coral or warm orange shirt + khaki chino + tan loafers — vibrant but wearable.',
  },
  'warm-spring': {
    fits: ['Relaxed fit', 'Slim fit', 'Casual tailored'],
    fitAdvice: 'Relaxed but shaped — nothing too tight or too loose. You suit easy, wearable silhouettes with a bit of structure at the shoulders.',
    fabrics: ['Cotton', 'Linen', 'Suede (warm tones)', 'Soft flannel', 'Light denim (warm wash)'],
    fabricAdvice: 'Warm-toned natural fabrics. Suede and warm denim work great for you — lean into earthy textures.',
    avoid: ['Cool grey wool', 'Black leather', 'Polyester', 'Stiff suits'],
    outfitFormula: 'Warm olive shirt + rust chino + tan suede boots — rich autumnal warmth with spring lightness.',
  },
  'light-summer': {
    fits: ['Slim fit', 'Relaxed slim', 'Soft tailored'],
    fitAdvice: 'Similar to Light Spring — relaxed slim cuts that are soft rather than structured. Avoid anything stiff or oversized.',
    fabrics: ['Cotton', 'Linen', 'Silk-cotton blend', 'Soft jersey', 'Light wool (cool tones)'],
    fabricAdvice: 'Light, flowing fabrics in cool or neutral tones. Soft textures complement your delicate, cool colouring.',
    avoid: ['Heavy winter wool', 'Stiff denim', 'Leather', 'Polyester'],
    outfitFormula: 'Soft lavender shirt + light grey chino + white leather trainers — cool and effortless.',
  },
  'true-summer': {
    fits: ['Slim fit', 'Tailored', 'Relaxed fit'],
    fitAdvice: 'Versatile — you suit both tailored and relaxed silhouettes. Focus on clean lines rather than fussy details.',
    fabrics: ['Cotton', 'Linen', 'Silk', 'Fine wool', 'Jersey'],
    fabricAdvice: 'Quality natural fabrics in cool, muted tones. Fine wool and silk work beautifully for a polished look.',
    avoid: ['Stiff heavy fabrics', 'Bright shiny materials', 'Overly structured shapes'],
    outfitFormula: 'Dusty blue linen shirt + charcoal slim trouser + grey suede loafer — quietly sophisticated.',
  },
  'soft-summer': {
    fits: ['Relaxed fit', 'Soft tailored', 'Slouchy (not shapeless)'],
    fitAdvice: 'Relaxed, soft silhouettes suit you best. Avoid very sharp tailoring — it fights your gentle, blended colouring.',
    fabrics: ['Cotton', 'Linen', 'Soft jersey', 'Modal', 'Light cashmere'],
    fabricAdvice: 'Soft, matte fabrics with no sheen. Cashmere and modal feel as soft as your palette looks.',
    avoid: ['Stiff suiting', 'Shiny fabrics', 'Very dark heavy fabrics', 'Crisp starched cotton'],
    outfitFormula: 'Muted dusty rose shirt + soft grey trouser + taupe suede trainers — harmonious and polished.',
  },
  'soft-autumn': {
    fits: ['Relaxed fit', 'Casual tailored', 'Laid-back slim'],
    fitAdvice: 'Easy, relaxed fits in earthy tones. Nothing too structured — you suit a casual, natural elegance.',
    fabrics: ['Cotton', 'Linen', 'Soft wool', 'Suede', 'Corduroy', 'Flannel'],
    fabricAdvice: 'Matte, earthy textures are your signature. Soft wool, corduroy and suede all work brilliantly with your muted warm palette.',
    avoid: ['Shiny fabrics', 'Stark white cotton', 'Cool grey wool', 'Stiff polyester'],
    outfitFormula: 'Warm terracotta shirt + olive cargo trouser + tan suede boots — rich and grounded.',
  },
  'true-autumn': {
    fits: ['Relaxed fit', 'Casual', 'Slightly oversized is fine'],
    fitAdvice: 'You suit relaxed and casual silhouettes well. A slightly oversized knit or jacket looks intentional on you — just avoid extremes.',
    fabrics: ['Wool', 'Tweed', 'Corduroy', 'Suede', 'Leather (warm brown tones)', 'Chunky knit'],
    fabricAdvice: 'Rich, textured fabrics are your power zone. Tweed, chunky knitwear, and warm leather perfectly complement your deep warm colouring.',
    avoid: ['Light pastel fabrics', 'Sheer materials', 'Cool grey wool', 'Polyester'],
    outfitFormula: 'Rust chunky knit + dark brown corduroy trouser + tan leather boots — the definitive Autumn look.',
  },
  'dark-autumn': {
    fits: ['Slim fit', 'Tailored', 'Structured'],
    fitAdvice: 'You carry structure and weight well. Tailored slim cuts balance your deep, rich colouring without overpowering.',
    fabrics: ['Wool', 'Leather (deep tones)', 'Heavy denim', 'Suede', 'Tweed', 'Cashmere'],
    fabricAdvice: 'Rich, substantial fabrics. Heavy, quality materials match the depth of your colouring — go for leather and wool without hesitation.',
    avoid: ['Light floaty fabrics', 'Pastels', 'Sheer materials', 'Flimsy jersey'],
    outfitFormula: 'Forest green wool turtleneck + dark olive slim chino + dark brown leather boots — commanding and rich.',
  },
  'dark-winter': {
    fits: ['Slim fit', 'Tailored', 'Sharp and structured'],
    fitAdvice: 'Sharp, tailored fits with clean lines are your signature. You have the contrast to carry strong silhouettes — use it.',
    fabrics: ['Wool', 'Cashmere', 'Heavy cotton', 'Leather', 'Structured denim'],
    fabricAdvice: 'High-quality, substantial fabrics with a clean finish. Cashmere and fine wool elevate your strong natural contrast.',
    avoid: ['Oversized baggy fits', 'Soft pastel fabrics', 'Flimsy materials', 'Muted tones in shapeless cuts'],
    outfitFormula: 'Crisp white shirt + charcoal wool trousers + black leather shoes — classic high-contrast Winter.',
  },
  'true-winter': {
    fits: ['Slim fit', 'Tailored', 'Minimalist and clean'],
    fitAdvice: 'Clean, precise silhouettes. True Winter is the most architectural season — strong clean lines are your friend.',
    fabrics: ['Wool', 'Cashmere', 'Silk', 'Structured cotton', 'Leather'],
    fabricAdvice: 'Clean, quality fabrics with a slight sheen or crisp finish. Avoid texture-heavy or rustic fabrics.',
    avoid: ['Earthy tweeds', 'Chunky rustic knits', 'Warm brown leathers', 'Loose shapeless fits'],
    outfitFormula: 'True navy slim suit + crisp white shirt + black leather derby — precise, clean, and powerful.',
  },
  'clear-winter': {
    fits: ['Slim fit', 'Tailored', 'Athletic fit'],
    fitAdvice: 'Sharp, fitted silhouettes suit your high contrast and vivid colouring. You suit athletic fits too — avoid anything baggy.',
    fabrics: ['Cotton', 'Wool', 'Cashmere', 'Structured jersey', 'Leather'],
    fabricAdvice: 'Clean, quality fabrics that hold their shape. Avoid anything too casual or unstructured.',
    avoid: ['Muted earthy tones in heavy fabrics', 'Shapeless knitwear', 'Oversized cuts'],
    outfitFormula: 'Royal blue slim shirt + true black slim chino + white trainers — vivid contrast, clean and modern.',
  },
}

export function getStyleGuide(subSeason: SubSeason): StyleGuide {
  return STYLE_GUIDES[subSeason]
}
