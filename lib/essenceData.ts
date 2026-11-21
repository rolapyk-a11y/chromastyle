export type EssenceType = 'dramatic' | 'natural' | 'romantic' | 'classic' | 'gamine' | 'ethereal'

export interface EssenceResult {
  primary: EssenceType
  secondary: EssenceType | null
  scores: Record<EssenceType, number>
}

export const ESSENCE_INFO: Record<EssenceType, {
  name: string
  tagline: string
  description: string
  icons: string[]
  styleGuide: {
    silhouettes: string[]
    fabrics: string[]
    patterns: string[]
    avoid: string[]
    celebrities: string[]
  }
  gradient: string
  textColor: string
}> = {
  dramatic: {
    name: 'Dramatic',
    tagline: 'Commanding · Sculptural · Bold',
    description: 'You radiate theatrical power. Clean lines, structured silhouettes, and bold minimalism are your natural language. You wear the clothes — they don\'t wear you.',
    icons: ['🖤', '⬛', '🔲'],
    styleGuide: {
      silhouettes: ['Long lean lines', 'Sharp geometry', 'Structured shoulders', 'Minimal waist emphasis'],
      fabrics: ['Gabardine', 'Stiff wool', 'Crisp leather', 'Heavy crepe'],
      patterns: ['Bold oversized graphics', 'Angular motifs', 'Monochromatic', 'Graphic black and white'],
      avoid: ['Small florals', 'Ruffles', 'Ditsy prints', 'Overly romantic details'],
      celebrities: ['Cate Blanchett', 'Tilda Swinton', 'Charlize Theron'],
    },
    gradient: 'from-slate-900 via-slate-800 to-zinc-800',
    textColor: 'text-white',
  },
  natural: {
    name: 'Natural',
    tagline: 'Effortless · Grounded · Organic',
    description: 'You have an easy, unpretentious beauty. Relaxed silhouettes, natural textures, and organic layers feel like home. You look best when it looks like you tried nothing at all.',
    icons: ['🌿', '🪨', '🌾'],
    styleGuide: {
      silhouettes: ['Relaxed and unconstructed', 'Long and layered', 'Wide-leg trousers', 'Oversized knits'],
      fabrics: ['Linen', 'Tweed', 'Denim', 'Soft cotton', 'Knit'],
      patterns: ['Earthy botanicals', 'Warm plaids', 'Loose florals', 'Organic geometrics'],
      avoid: ['Stiff tailoring', 'Very fitted pieces', 'Overly ornate details', 'Fussy accessories'],
      celebrities: ['Jennifer Aniston', 'Cameron Diaz', 'Kate Winslet'],
    },
    gradient: 'from-amber-800 via-amber-700 to-orange-700',
    textColor: 'text-amber-50',
  },
  romantic: {
    name: 'Romantic',
    tagline: 'Sensual · Curved · Alluring',
    description: 'You radiate warm, inviting femininity. Your waist is always defined, your fabrics always soft and drapy. You look best when clothing embraces your natural curves.',
    icons: ['🌹', '🎀', '✨'],
    styleGuide: {
      silhouettes: ['Hourglass always', 'Wrap dresses', 'Fit-and-flare', 'Bias-cut', 'Sweetheart necklines'],
      fabrics: ['Flowing chiffon', 'Delicate lace', 'Satin', 'Soft jersey'],
      patterns: ['Small delicate florals', 'Soft ornate designs', 'Lace', 'Feminine prints'],
      avoid: ['Boxy shapes', 'Sharp angular cuts', 'Very structured tailoring', 'Oversized pieces'],
      celebrities: ['Marilyn Monroe', 'Nigella Lawson', 'Blake Lively'],
    },
    gradient: 'from-rose-500 via-pink-400 to-rose-400',
    textColor: 'text-rose-950',
  },
  classic: {
    name: 'Classic',
    tagline: 'Timeless · Balanced · Refined',
    description: 'You have naturally symmetrical, elegant beauty. Clean lines and moderate proportions suit you perfectly. You invest in quality over trend and always look appropriate — without being boring.',
    icons: ['⚖️', '🏛️', '💎'],
    styleGuide: {
      silhouettes: ['Symmetrical and clean', 'Moderate proportions', 'Gently structured', 'Nothing extreme'],
      fabrics: ['Silk', 'Fine cashmere', 'Light wool', 'Quality cotton'],
      patterns: ['Quiet stripes', 'Fine houndstooth', 'Subtle paisleys', 'Small refined florals'],
      avoid: ['Extremes in any direction', 'Very avant-garde', 'Very casual or very fussy', 'Overpowering prints'],
      celebrities: ['Grace Kelly', 'Audrey Hepburn', 'Kate Middleton'],
    },
    gradient: 'from-blue-900 via-blue-800 to-indigo-800',
    textColor: 'text-blue-50',
  },
  gamine: {
    name: 'Gamine',
    tagline: 'Playful · Quirky · Unexpected',
    description: 'You have a youthful, witty energy that\'s completely your own. You mix and match instinctively, break rules on purpose, and look best in playful proportions that no one else could pull off.',
    icons: ['⚡', '🎭', '🃏'],
    styleGuide: {
      silhouettes: ['Cropped and defined', 'Short hems', 'Nipped waists', 'Mixed proportions'],
      fabrics: ['Crisp cotton', 'Denim', 'Light wools', 'Playful textures'],
      patterns: ['Colour blocking', 'Bold contrast', 'Fun polka dots', 'Graphic prints in small scale'],
      avoid: ['Very long and flowing', 'Heavy or plush fabrics', 'Overly romantic details', 'Boring basics'],
      celebrities: ['Audrey Hepburn (early)', 'Zooey Deschanel', 'Pixie Lott'],
    },
    gradient: 'from-violet-800 via-indigo-700 to-purple-700',
    textColor: 'text-violet-50',
  },
  ethereal: {
    name: 'Ethereal',
    tagline: 'Dreamy · Delicate · Otherworldly',
    description: 'You have a transcendent, otherworldly quality. Flowing, transparent, and softly luminous fabrics are your element. You look best when your clothes seem to float rather than sit on you.',
    icons: ['🌙', '🕊️', '🫧'],
    styleGuide: {
      silhouettes: ['Long and flowing', 'Nothing fitted or boxy', 'Draped and layered', 'Garments that float'],
      fabrics: ['Chiffon', 'Voile', 'Tulle', 'Silk', 'Iridescent fabrics'],
      patterns: ['Delicate florals', 'Lace', 'Embroidery', 'Subtle shimmer'],
      avoid: ['Stiff or structured pieces', 'Bold graphics', 'Heavy textures', 'Very casual denim'],
      celebrities: ['Cate Blanchett as Galadriel', 'Florence Welch', 'Björk'],
    },
    gradient: 'from-violet-200 via-purple-100 to-pink-100',
    textColor: 'text-purple-900',
  },
}

// Quiz questions with scoring
export interface QuizOption {
  id: string
  label: string
  sublabel: string
  keywords: string[]
  essence: EssenceType
  illustration: 'dramatic' | 'natural' | 'romantic' | 'classic' | 'gamine' | 'ethereal'
  scores: Partial<Record<EssenceType, number>>
}

export interface QuizQuestion {
  id: number
  question: string
  hint: string
  options: QuizOption[]
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Which outfit silhouette feels most like you?',
    hint: 'Ignore colour for now — just the shape and feel of the clothes',
    options: [
      {
        id: '1a',
        label: 'Long & Structured',
        sublabel: 'Sharp lines, minimal waist, dramatic length',
        keywords: ['Tailored', 'Elongated', 'Precise'],
        essence: 'dramatic',
        illustration: 'dramatic',
        scores: { dramatic: 3 },
      },
      {
        id: '1b',
        label: 'Relaxed & Layered',
        sublabel: 'Easy, unconstructed, comfortable',
        keywords: ['Loose', 'Layered', 'Effortless'],
        essence: 'natural',
        illustration: 'natural',
        scores: { natural: 3 },
      },
      {
        id: '1c',
        label: 'Waist-Defined & Flowing',
        sublabel: 'Fitted through the waist, soft below',
        keywords: ['Curved', 'Feminine', 'Soft'],
        essence: 'romantic',
        illustration: 'romantic',
        scores: { romantic: 3 },
      },
      {
        id: '1d',
        label: 'Cropped & Contrasting',
        sublabel: 'Short on top, playful proportions',
        keywords: ['Cropped', 'Playful', 'Mixed'],
        essence: 'gamine',
        illustration: 'gamine',
        scores: { gamine: 3 },
      },
    ],
  },
  {
    id: 2,
    question: 'Which fabric speaks to you most?',
    hint: 'Think about what you love to touch and wear against your skin',
    options: [
      {
        id: '2a',
        label: 'Crisp & Tailored',
        sublabel: 'Holds its shape, clean and precise',
        keywords: ['Sharp', 'Structured', 'Polished'],
        essence: 'classic',
        illustration: 'classic',
        scores: { dramatic: 2, classic: 1 },
      },
      {
        id: '2b',
        label: 'Natural & Textured',
        sublabel: 'Linen, wool, cotton — tactile and organic',
        keywords: ['Linen', 'Wool', 'Organic'],
        essence: 'natural',
        illustration: 'natural',
        scores: { natural: 3 },
      },
      {
        id: '2c',
        label: 'Soft & Flowing',
        sublabel: 'Drapy, moves with you, wraps and folds',
        keywords: ['Chiffon', 'Silk', 'Drapy'],
        essence: 'romantic',
        illustration: 'romantic',
        scores: { romantic: 2, ethereal: 1 },
      },
      {
        id: '2d',
        label: 'Light & Gossamer',
        sublabel: 'Sheer, delicate, almost weightless',
        keywords: ['Voile', 'Tulle', 'Sheer'],
        essence: 'ethereal',
        illustration: 'ethereal',
        scores: { ethereal: 3 },
      },
    ],
  },
  {
    id: 3,
    question: 'Which style energy feels most naturally like you?',
    hint: 'Not what you aspire to — what you actually feel on your best day',
    options: [
      {
        id: '3a',
        label: 'Commanding & Powerful',
        sublabel: 'People notice when you walk in',
        keywords: ['Bold', 'Theatrical', 'Striking'],
        essence: 'dramatic',
        illustration: 'dramatic',
        scores: { dramatic: 3 },
      },
      {
        id: '3b',
        label: 'Effortless & Grounded',
        sublabel: 'Looks easy, real, and completely natural',
        keywords: ['Easy', 'Warm', 'Authentic'],
        essence: 'natural',
        illustration: 'natural',
        scores: { natural: 3 },
      },
      {
        id: '3c',
        label: 'Warm & Feminine',
        sublabel: 'Soft, inviting, beautifully feminine',
        keywords: ['Sensual', 'Alluring', 'Soft'],
        essence: 'romantic',
        illustration: 'romantic',
        scores: { romantic: 3 },
      },
      {
        id: '3d',
        label: 'Playful & Unexpected',
        sublabel: 'Surprising combinations, your own rules',
        keywords: ['Quirky', 'Fun', 'Witty'],
        essence: 'gamine',
        illustration: 'gamine',
        scores: { gamine: 3 },
      },
    ],
  },
  {
    id: 4,
    question: 'Which detail makes you say "I love this piece"?',
    hint: 'The finishing touch that makes something feel completely right',
    options: [
      {
        id: '4a',
        label: 'Sharp Lapels & Clean Seams',
        sublabel: 'Precise tailoring and crisp structure',
        keywords: ['Lapels', 'Pleats', 'Structure'],
        essence: 'classic',
        illustration: 'classic',
        scores: { classic: 2, dramatic: 1 },
      },
      {
        id: '4b',
        label: 'Wide Pockets & Easy Drape',
        sublabel: 'Functional, relaxed, natural movement',
        keywords: ['Pockets', 'Drape', 'Easy'],
        essence: 'natural',
        illustration: 'natural',
        scores: { natural: 3 },
      },
      {
        id: '4c',
        label: 'Ruffles, Lace & Soft Bows',
        sublabel: 'Romantic and feminine embellishment',
        keywords: ['Ruffles', 'Lace', 'Bows'],
        essence: 'romantic',
        illustration: 'romantic',
        scores: { romantic: 2, ethereal: 1 },
      },
      {
        id: '4d',
        label: 'Delicate Embroidery & Pearl Buttons',
        sublabel: 'Intricate, precious, otherworldly',
        keywords: ['Embroidery', 'Pearls', 'Delicate'],
        essence: 'ethereal',
        illustration: 'ethereal',
        scores: { ethereal: 2, romantic: 1 },
      },
    ],
  },
  {
    id: 5,
    question: 'Which print or pattern speaks to you?',
    hint: 'The one you\'d actually buy and wear, not just admire on someone else',
    options: [
      {
        id: '5a',
        label: 'Bold Graphic or Geometric',
        sublabel: 'High contrast, sharp, statement-making',
        keywords: ['Graphic', 'Geometric', 'Bold'],
        essence: 'dramatic',
        illustration: 'dramatic',
        scores: { dramatic: 2, gamine: 1 },
      },
      {
        id: '5b',
        label: 'Earthy Florals & Botanicals',
        sublabel: 'Organic, warm, loosely drawn',
        keywords: ['Botanical', 'Plaid', 'Earthy'],
        essence: 'natural',
        illustration: 'natural',
        scores: { natural: 3 },
      },
      {
        id: '5c',
        label: 'Delicate Florals & Soft Prints',
        sublabel: 'Small, sweet, ornate and feminine',
        keywords: ['Floral', 'Soft', 'Ornate'],
        essence: 'romantic',
        illustration: 'romantic',
        scores: { romantic: 2, ethereal: 1 },
      },
      {
        id: '5d',
        label: 'Clean Tones & Quiet Stripes',
        sublabel: 'Refined, subtle, impeccably tasteful',
        keywords: ['Minimal', 'Tonal', 'Refined'],
        essence: 'classic',
        illustration: 'classic',
        scores: { classic: 3 },
      },
    ],
  },
  {
    id: 6,
    question: 'Where would you feel most "yourself" dressed up?',
    hint: 'The setting where your natural style fits perfectly',
    options: [
      {
        id: '6a',
        label: 'An Art Gallery Opening',
        sublabel: 'Minimal, powerful, everyone looks',
        keywords: ['Editorial', 'Modern', 'Striking'],
        essence: 'dramatic',
        illustration: 'dramatic',
        scores: { dramatic: 3 },
      },
      {
        id: '6b',
        label: 'A Garden Party or Market',
        sublabel: 'Easy, warm, effortlessly beautiful',
        keywords: ['Outdoors', 'Relaxed', 'Natural'],
        essence: 'natural',
        illustration: 'natural',
        scores: { natural: 3 },
      },
      {
        id: '6c',
        label: 'A Candlelit Dinner',
        sublabel: 'Soft lighting, intimate, beautifully feminine',
        keywords: ['Romantic', 'Intimate', 'Warm'],
        essence: 'romantic',
        illustration: 'romantic',
        scores: { romantic: 3 },
      },
      {
        id: '6d',
        label: 'A Ballet or Parisian Café',
        sublabel: 'Refined, timeless, quietly stunning',
        keywords: ['Elegant', 'Timeless', 'Refined'],
        essence: 'classic',
        illustration: 'classic',
        scores: { classic: 2, ethereal: 1 },
      },
    ],
  },
]

export function calculateEssence(answers: Record<number, string>): EssenceResult {
  const scores: Record<EssenceType, number> = {
    dramatic: 0,
    natural: 0,
    romantic: 0,
    classic: 0,
    gamine: 0,
    ethereal: 0,
  }

  QUIZ_QUESTIONS.forEach(question => {
    const answerId = answers[question.id]
    if (!answerId) return
    const option = question.options.find(o => o.id === answerId)
    if (!option) return
    Object.entries(option.scores).forEach(([essence, points]) => {
      scores[essence as EssenceType] += points
    })
  })

  const sorted = (Object.entries(scores) as [EssenceType, number][])
    .sort(([, a], [, b]) => b - a)

  const primary = sorted[0][0]
  const secondary = sorted[1][1] >= sorted[0][1] * 0.6 ? sorted[1][0] : null

  return { primary, secondary, scores }
}
