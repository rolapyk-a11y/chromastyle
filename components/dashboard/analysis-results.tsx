'use client'

import { ColorAnalysis, SEASON_INFO, SUB_SEASON_INFO } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, RotateCcw, Sparkles, CheckCircle, XCircle } from 'lucide-react'

// Plain-English descriptions of each sub-season for men with no colour knowledge
const SEASON_EXPLAINER: Record<string, {
  headline: string
  plain: string
  rule: string
  wearLabel: string
  avoidLabel: string
}> = {
  'light-spring':   { headline: 'Your skin is light with warm, peachy undertones.', plain: 'You belong to the Spring family — warm and light. Your complexion is delicate and sun-warmed, not cool or pink. Clothes in warm, soft tones will make you look healthy and fresh.', rule: 'Golden rule: swap black for warm brown. Swap white for ivory or cream.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that wash you out' },
  'true-spring':    { headline: 'Your skin is warm and golden with a clear, sunny quality.', plain: 'You are a classic Spring — warm undertones and good natural vibrancy. You can wear bright, warm colours that would overwhelm other people. Earthy cool tones drain your colour.', rule: 'Golden rule: always pick the warm version of a colour. Camel over grey. Coral over pink.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that wash you out' },
  'warm-spring':    { headline: 'Your skin is warm and golden, leaning towards rich amber tones.', plain: 'You sit between Spring and Autumn — warm and rich. You carry deeper, richer warm colours than most Springs. Golden tones work brilliantly on you. Cool blues and grey tones look wrong.', rule: 'Golden rule: always pick the warmest, richest version of any colour.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that wash you out' },
  'light-summer':   { headline: 'Your skin is fair and cool with soft, rose-pink undertones.', plain: 'You belong to the Summer family — cool and light. Your complexion is porcelain and refined. Soft cool tones look effortless on you. Warm orange and golden tones clash with your natural colouring.', rule: 'Golden rule: swap black for dove grey or navy. Swap white for soft off-white.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that drain you' },
  'true-summer':    { headline: 'Your skin is cool-toned with soft, muted undertones.', plain: 'You are a classic Summer — cool, understated, and refined. Dusty, muted cool tones look polished and sharp on you. Warm earthy tones or vivid brights will overpower your natural colouring.', rule: 'Golden rule: navy replaces black. Soft rose or slate replaces red.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that clash on you' },
  'soft-summer':    { headline: 'Your skin is cool-neutral with a soft, slightly muted quality.', plain: 'You sit between Summer and Autumn with neutral-cool undertones. You suit muted, greyed-down versions of colours — never vivid or sharp. Think dusty blue rather than electric blue, muted mauve rather than bright pink.', rule: 'Golden rule: if a colour looks too vivid on the shelf, it\'s too vivid for you. Always go one shade softer.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that overpower you' },
  'soft-autumn':    { headline: 'Your skin is warm-neutral with a soft, earthy quality.', plain: 'You belong to the Autumn family — warm and muted. Your skin has gentle warmth without being strongly golden. Earth tones, soft terracottas, and warm taupes look effortless on you. Cool, vivid tones clash.', rule: 'Golden rule: choose the earthy, muted version of every colour. Terracotta over orange. Sage over lime.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that clash on you' },
  'true-autumn':    { headline: 'Your skin is warm and rich with deep golden or olive undertones.', plain: 'You are the classic Autumn — warm, earthy, and rich. The colours of autumn leaves are literally your best colours: burnt orange, rust, olive green, warm brown. Cool tones or pastels will drain you completely.', rule: 'Golden rule: replace black with dark brown. Replace white with warm cream. Never wear grey.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that drain you' },
  'dark-autumn':    { headline: 'Your skin is deep and warm with rich, intense undertones.', plain: 'You are a Deep Autumn — the most intense of the warm seasons. You carry very deep, saturated earthy colours that lighter skin types could never pull off. Pale pastels and cool tones look completely wrong on you.', rule: 'Golden rule: go deep and rich. The darker the earthy tone, the better it works on you.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that look wrong on you' },
  'dark-winter':    { headline: 'Your skin is deep and cool with intense undertones.', plain: 'You belong to the Winter family — cool and deep. You have strong natural contrast between your skin, hair, and eyes. Rich, cool jewel tones and deep neutrals look powerful on you. Warm earthy tones look muddy.', rule: 'Golden rule: go dark and cool. Navy, deep teal, burgundy, charcoal. Avoid warm tones entirely.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that look muddy on you' },
  'true-winter':    { headline: 'Your skin is cool-toned with high contrast between your features.', plain: 'You are a classic Winter — cool, high-contrast, and dramatic. Black and white look incredible on you. You can wear colours no other season can carry. Warm earthy tones will dull your natural sharpness.', rule: 'Golden rule: high contrast always works. Black top + white shirt. Navy + crisp white. Never warm browns.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that dull you' },
  'clear-winter':   { headline: 'Your skin is cool with bright, vivid clarity and high contrast.', plain: 'You bridge Winter and Spring — cool but with exceptional clarity. You can wear the most saturated, vivid colours of anyone. Muted or dusty tones look flat on you and waste your natural colouring.', rule: 'Golden rule: always pick the brightest, most vivid version of a colour. You can carry it.', wearLabel: 'Colours that make you look great', avoidLabel: 'Colours that look flat on you' },
}

// Famous men by sub-season.
// Only high-confidence examples that are broadly agreed upon across multiple
// professional colour analysis sources. Each links to a search so users can
// verify the reasoning themselves rather than just trusting the app.
const SEASON_CELEBRITIES: Record<string, Array<{
  name: string
  features: string   // the specific physical features that place them in this season
  whyItFits: string  // one sentence connecting features → season logic
}>> = {
  'light-spring': [
    { name: 'Eddie Redmayne', features: 'Porcelain skin with peachy warmth, auburn-golden hair, green eyes, very low contrast overall', whyItFits: 'Warm undertone + very light value + low contrast = Light Spring' },
    { name: 'Paul Bettany', features: 'Fair skin with peachy-golden undertone, light brown hair, blue eyes, delicate look', whyItFits: 'Warm delicate colouring with low depth — the defining Light Spring combination' },
    { name: 'Domhnall Gleeson', features: 'Very fair skin, red-gold hair, blue-green eyes, freckles, gentle warmth', whyItFits: 'Warm undertone is clear from the red-gold hair; lightness and freckles confirm Light Spring' },
  ],
  'true-spring': [
    { name: 'Simon Baker', features: 'Golden-blonde hair, warm sun-kissed skin, blue-green eyes, clear and bright look', whyItFits: 'High chroma warm colouring with clear brightness — textbook True Spring' },
    { name: 'Owen Wilson', features: 'Sandy warm-blonde hair, golden peachy skin, blue eyes with warm surroundings', whyItFits: 'Strong warm undertone + medium value + natural vibrancy = True Spring' },
    { name: 'Kevin McKidd', features: 'Auburn hair, warm ruddy complexion, blue eyes, clearly warm and vivid', whyItFits: 'Auburn hair is a reliable warm-family marker; the skin warmth and clarity confirm True Spring' },
  ],
  'warm-spring': [
    { name: 'Matthew McConaughey', features: 'Deep golden skin, warm blonde-brown hair, green eyes, tanned warm look', whyItFits: 'Warm undertone + deeper value than most Springs + golden intensity = Warm Spring bridging to Autumn' },
    { name: 'Brad Pitt', features: 'Warm golden skin, sandy-to-golden hair, green eyes, rich warm vibrancy', whyItFits: 'Warm family confirmed by golden skin; richer depth and vibrancy place him at the Warm Spring end' },
  ],
  'light-summer': [
    { name: 'Prince William', features: 'Fair cool-toned skin, ash-blonde hair, blue eyes, soft and understated', whyItFits: 'Cool undertone + very light value + muted quality = Light Summer' },
    { name: 'Bradley Cooper', features: 'Fair cool skin, ash-brown hair, grey-blue eyes, refined and cool look', whyItFits: 'Cool undertone is clear in the ashy hair and grey-blue eyes; fairness confirms Light Summer' },
    { name: 'Tobey Maguire', features: 'Light cool skin, soft brown hair, blue eyes, gentle and light features', whyItFits: 'Cool-toned, light, and soft — the three markers of Light Summer' },
  ],
  'true-summer': [
    { name: 'Colin Firth', features: 'Medium cool skin, ash-brown hair, cool grey-blue eyes, polished understated look', whyItFits: 'Cool undertone + medium value + muted chroma = classic True Summer' },
    { name: 'Paul Newman', features: 'Medium cool skin, ash-brown hair, famously vivid blue eyes, refined features', whyItFits: 'Cool and muted overall with the characteristic Summer softness; vivid eyes are common in Summers' },
  ],
  'soft-summer': [
    { name: 'Timothée Chalamet', features: 'Neutral-cool skin, soft dark hair, grey-green eyes, muted and understated', whyItFits: 'Neutral-cool undertone + low chroma in skin and hair = Soft Summer bridging towards Autumn' },
    { name: 'Jake Gyllenhaal', features: 'Neutral medium skin, soft brown hair, muted blue-green eyes, soft overall contrast', whyItFits: 'Muted, neutral-cool quality throughout — the hallmark of Soft Summer' },
  ],
  'soft-autumn': [
    { name: 'Ewan McGregor', features: 'Warm-neutral medium skin, sandy-golden hair, hazel eyes, soft and earthy', whyItFits: 'Warm undertone present but muted + medium value + earthy quality = Soft Autumn' },
    { name: 'Clive Owen', features: 'Warm-neutral medium skin, dark warm hair, hazel eyes, understated warmth', whyItFits: 'Warm family confirmed but chroma is muted throughout — Soft Autumn' },
  ],
  'true-autumn': [
    { name: 'George Clooney', features: 'Warm olive-toned skin, dark warm brown hair, warm brown eyes, earthy richness', whyItFits: 'Strong warm undertone + rich earthy depth + medium-high chroma = True Autumn' },
    { name: 'Clint Eastwood', features: 'Golden-olive skin, warm brown hair, hazel eyes, rugged warm depth', whyItFits: 'Classic Autumn warmth and richness — the earthy intensity is the season\'s signature' },
    { name: 'Josh Duhamel', features: 'Golden warm skin, warm brown hair, hazel-green eyes, clear warm vibrancy', whyItFits: 'Warm undertone + medium-rich depth + clear earthy warmth = True Autumn' },
  ],
  'dark-autumn': [
    { name: 'Oscar Isaac', features: 'Rich warm-olive skin, very dark hair, warm dark brown eyes, intense warmth', whyItFits: 'Warm undertone confirmed by olive skin; deep value and intensity = Dark Autumn' },
    { name: 'Dwayne Johnson', features: 'Deep warm golden-brown skin, dark features, warm olive undertone throughout', whyItFits: 'Very deep value + strong warm undertone = Dark Autumn, the deepest warm season' },
  ],
  'dark-winter': [
    { name: 'Keanu Reeves', features: 'Deep neutral-cool skin, jet black hair, very dark brown eyes, high contrast', whyItFits: 'Cool undertone + very dark value + high contrast between features = Dark Winter' },
    { name: 'Adam Driver', features: 'Deep cool skin, black hair, dark eyes, angular and high-contrast features', whyItFits: 'Cool family with maximum depth — the defining Dark Winter combination' },
  ],
  'true-winter': [
    { name: 'Henry Cavill', features: 'Fair cool porcelain skin, dark brown hair, blue eyes — extreme light-dark contrast', whyItFits: 'Cool undertone + high contrast between very fair skin and dark hair = True Winter' },
    { name: 'Ian Somerhalder', features: 'Pale cool skin, very dark hair, vivid blue eyes, striking high contrast', whyItFits: 'The extreme contrast between pale cool skin and dark features is the True Winter signature' },
    { name: 'Tom Hiddleston', features: 'Porcelain cool skin, dark hair, cool green eyes, precise and cool features', whyItFits: 'Cool undertone throughout with clear high contrast — True Winter' },
  ],
  'clear-winter': [
    { name: 'Zac Efron', features: 'Clear cool skin, dark hair, vivid blue eyes, high contrast with bright clarity', whyItFits: 'Cool + high contrast + exceptional chroma/clarity = Clear Winter bridging to Spring' },
    { name: 'Chris Evans', features: 'Clear cool skin, dark brown hair, bright blue eyes, vivid and high-contrast look', whyItFits: 'The brightness and clarity of his colouring alongside cool contrast places him in Clear Winter' },
  ],
}

// Map hex codes to readable colour names
const HEX_NAMES: Record<string, string> = {
  '#E3A274': 'Peach', '#ECA299': 'Soft Coral', '#F5D4C0': 'Apricot', '#A8D8C4': 'Warm Mint',
  '#F5E6D8': 'Warm Cream', '#F9EBD0': 'Ivory', '#D4EAD8': 'Celery', '#FDDDB3': 'Buttercream',
  '#F9C74F': 'Golden Yellow', '#FFC857': 'Warm Gold', '#F3722C': 'Warm Coral',
  '#F7B567': 'Peach Gold', '#C68642': 'Caramel', '#FFB347': 'Mango', '#FF8C00': 'Dark Orange',
  '#DAA520': 'Goldenrod', '#D4AF37': 'Gold', '#CD853F': 'Peru Brown',
  '#A4C1F3': 'Powder Blue', '#BDA7DD': 'Lavender', '#C8B4D0': 'Soft Lilac',
  '#99CCEE': 'Misty Blue', '#DDD4EC': 'Icy Lilac', '#B8D0E8': 'Cool Blue',
  '#CED6E0': 'Foggy Sky', '#A6B8D2': 'Bluebell', '#6F96A2': 'Ocean Slate',
  '#92ADAF': 'Soft Spruce', '#D6C7D9': 'Misty Petal', '#BDAECF': 'Lavender Dust',
  '#E4C4CA': 'Hushed Blush', '#7898B4': 'Slate Blue',
  '#7598C4': 'Dusty Blue', '#78ABC6': 'Soft Blue', '#998CBD': 'Muted Lavender',
  '#9CAF88': 'Soft Olive', '#BDBFA0': 'Light Sage', '#D9927A': 'Muted Terracotta',
  '#D1B7A3': 'Soft Camel', '#D2B48C': 'Tan', '#D99058': 'Warm Sand',
  '#CC5500': 'Burnt Orange', '#B7410E': 'Rust', '#DAA521': 'Mustard',
  '#708238': 'Olive Green', '#800020': 'Burgundy', '#6B3A2A': 'Warm Chocolate',
  '#8B4513': 'Saddle Brown', '#A0522D': 'Sienna', '#556B2F': 'Dark Olive',
  '#924819': 'Burnt Sienna', '#954344': 'Deep Burgundy', '#4A1B1F': 'Dark Chocolate',
  '#404C24': 'Army Green', '#675100': 'Muddy Olive', '#005F6B': 'Dark Teal',
  '#0D0F1A': 'Near Black', '#003153': 'Prussian Blue', '#015871': 'Deep Teal',
  '#00491E': 'Deep Emerald', '#7D1B4D': 'Rich Plum', '#5F2566': 'Dark Purple',
  '#7A1F3D': 'Beet Red', '#64242E': 'Deep Burgundy', '#191970': 'Midnight Blue',
  '#000000': 'Black', '#FFFFFF': 'White', '#003087': 'Cobalt Blue',
  '#CC0000': 'True Red', '#9B111E': 'Ruby Red', '#FF00FF': 'Magenta',
  '#E91E8C': 'Hot Pink', '#800080': 'Purple', '#4B0082': 'Indigo',
  '#DA4A94': 'Vivid Pink', '#BE74C9': 'Orchid', '#DA4E5F': 'Bright Coral',
  '#0000CD': 'Electric Blue', '#00CED1': 'Turquoise', '#9400D3': 'Vivid Violet',
  '#FF1493': 'Deep Pink', '#7B68EE': 'Medium Slate',
}

function getColourName(hex: string): string {
  return HEX_NAMES[hex] ?? hex
}

interface AnalysisResultsProps {
  analysis: ColorAnalysis
  onReset: () => void
  onContinue: () => void
  onEssenceQuiz?: () => void
}

export function AnalysisResults({ analysis, onReset, onContinue, onEssenceQuiz }: AnalysisResultsProps) {
  const seasonInfo = SEASON_INFO[analysis.season]
  const subSeasonInfo = SUB_SEASON_INFO[analysis.sub_season]
  const explainer = SEASON_EXPLAINER[analysis.sub_season]
  const details = analysis.analysis_details

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Season announcement ── */}
      <div className={`rounded-2xl p-6 bg-gradient-to-br ${seasonInfo.gradient} text-white`}>
        <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
          <Sparkles className="w-4 h-4" />
          Analysis complete
        </div>
        <h1 className="text-3xl font-bold mb-1">
          {subSeasonInfo.name}
        </h1>
        <p className="text-white/85 text-sm font-medium mb-4">
          {explainer?.headline}
        </p>
        <p className="text-white/80 text-sm leading-relaxed">
          {explainer?.plain}
        </p>
      </div>

      {/* ── Famous men with this season ── */}
      {SEASON_CELEBRITIES[analysis.sub_season] && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-1">Men who share your colouring</h2>
            <p className="text-xs text-muted-foreground mb-1">
              These are high-confidence examples agreed on by professional colour analysts.
              Each card explains the specific features that place them in {subSeasonInfo.name} —
              compare those features to your own.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Tap any name to see photos and verify the analysis yourself.
            </p>
            <div className="space-y-3">
              {SEASON_CELEBRITIES[analysis.sub_season].map(({ name, features, whyItFits }) => (
                <a
                  key={name}
                  href={`https://www.google.com/search?q=${encodeURIComponent(name + ' seasonal colour analysis')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-border/50 px-4 py-3 hover:bg-secondary/40 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="font-medium text-sm">{name}</p>
                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      Verify →
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{features}</p>
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-500 text-xs mt-0.5 shrink-0">✓</span>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">{whyItFits}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── The golden rule ── */}
      {explainer?.rule && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <p className="text-sm font-medium">{explainer.rule}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Best colours ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold">{explainer?.wearLabel ?? 'Colours that suit you'}</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {analysis.best_colors.map((hex) => (
            <div key={hex} className="flex flex-col items-center gap-1">
              <div
                className="w-full aspect-square rounded-xl border border-white/10 shadow-sm"
                style={{ backgroundColor: hex }}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {getColourName(hex)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Avoid colours ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold">{explainer?.avoidLabel ?? 'Colours to avoid'}</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {analysis.avoid_colors.map((hex) => (
            <div key={hex} className="flex flex-col items-center gap-1 opacity-60">
              <div
                className="w-full aspect-square rounded-xl border border-white/10 shadow-sm relative"
                style={{ backgroundColor: hex }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white/80 drop-shadow" />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {getColourName(hex)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Eye-enhancing colours ── */}
      {analysis.eye_enhancing_colors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">👁</span>
            <h2 className="font-semibold">Colours that make your eyes stand out</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {analysis.eye_enhancing_colors.map((hex) => (
              <div key={hex} className="flex flex-col items-center gap-1">
                <div
                  className="w-full aspect-square rounded-xl border border-white/10 shadow-sm"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {getColourName(hex)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What was detected ── */}
      {details && (
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              What we detected
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Skin tone</p>
                <p className="font-medium capitalize">{analysis.skin_undertone}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Hair</p>
                <p className="font-medium capitalize">{analysis.hair_color ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Eyes</p>
                <p className="font-medium capitalize">{analysis.eye_color ?? '—'}</p>
              </div>
            </div>
            {details.overall_recommendation && (
              <p className="text-sm text-muted-foreground pt-2 border-t border-border/40">
                {details.overall_recommendation}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Style tips ── */}
      {details?.style_tips && details.style_tips.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">Practical style rules for you</h2>
            <ul className="space-y-2">
              {details.style_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Essence quiz CTA ── */}
      {onEssenceQuiz && (
        <Card className="border-primary/30 bg-primary/5 text-center">
          <CardContent className="p-6">
            <Sparkles className="w-7 h-7 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Next: find your style type</h3>
            <p className="text-sm text-muted-foreground mb-4">
              6 quick questions — are you Dramatic, Natural, Classic, Romantic? Knowing this helps you pick the right cuts and fits, not just colours.
            </p>
            <Button variant="secondary" size="lg" onClick={onEssenceQuiz}>
              Take the Style Quiz
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3 pb-4">
        <Button variant="outline" className="flex-1" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Analyse Again
        </Button>
        <Button className="flex-1" onClick={onContinue}>
          Shop Your Colours
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
