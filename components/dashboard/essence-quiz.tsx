'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check, Sparkles, RefreshCcw } from 'lucide-react'
import {
  QUIZ_QUESTIONS,
  ESSENCE_INFO,
  calculateEssence,
  type EssenceType,
  type EssenceResult,
} from '@/lib/essenceData'

// ─── SVG Silhouette Illustrations ───────────────────────────────────────────
// Each illustration visually encodes the essence archetype as a distinct shape.

function DramaticIllustration() {
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden>
      {/* Head */}
      <circle cx="60" cy="18" r="13" fill="white" fillOpacity={0.85} />
      {/* Long structured coat — tall, sharp trapezoid */}
      <polygon points="40,32 80,32 88,155 32,155" fill="white" fillOpacity={0.9} />
      {/* Sharp lapel lines */}
      <line x1="60" y1="42" x2="38" y2="68" stroke="#1e293b" strokeWidth="2.5" />
      <line x1="60" y1="42" x2="82" y2="68" stroke="#1e293b" strokeWidth="2.5" />
      {/* Vertical seam — precise */}
      <line x1="60" y1="55" x2="60" y2="148" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="5,4" strokeOpacity={0.35} />
      {/* Shoulder lines */}
      <line x1="40" y1="38" x2="25" y2="42" stroke="white" strokeWidth="2" strokeOpacity={0.5} />
      <line x1="80" y1="38" x2="95" y2="42" stroke="white" strokeWidth="2" strokeOpacity={0.5} />
    </svg>
  )
}

function NaturalIllustration() {
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden>
      {/* Head */}
      <circle cx="60" cy="18" r="13" fill="white" fillOpacity={0.85} />
      {/* Loose oversized top — wide, organic shape */}
      <ellipse cx="60" cy="72" rx="42" ry="38" fill="white" fillOpacity={0.85} />
      {/* Relaxed trousers — wide leg */}
      <rect x="26" y="100" width="30" height="55" rx="6" fill="white" fillOpacity={0.7} />
      <rect x="64" y="100" width="30" height="55" rx="6" fill="white" fillOpacity={0.7} />
      {/* Texture hint — horizontal lines */}
      <line x1="22" y1="65" x2="98" y2="65" stroke="#92400e" strokeWidth="1.5" strokeOpacity={0.3} />
      <line x1="22" y1="75" x2="98" y2="75" stroke="#92400e" strokeWidth="1.5" strokeOpacity={0.3} />
      <line x1="22" y1="85" x2="98" y2="85" stroke="#92400e" strokeWidth="1.5" strokeOpacity={0.3} />
      {/* Drop shoulder suggestion */}
      <line x1="18" y1="55" x2="35" y2="60" stroke="white" strokeWidth="3" strokeOpacity={0.6} />
      <line x1="102" y1="55" x2="85" y2="60" stroke="white" strokeWidth="3" strokeOpacity={0.6} />
    </svg>
  )
}

function RomanticIllustration() {
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden>
      {/* Head */}
      <circle cx="60" cy="16" r="13" fill="white" fillOpacity={0.85} />
      {/* Fitted bodice */}
      <path d="M38,30 L82,30 L76,78 Q60,88 44,78 Z" fill="white" fillOpacity={0.92} />
      {/* Waist cinch — the key romantic detail */}
      <path d="M44,78 Q60,92 76,78" fill="none" stroke="white" strokeWidth="3" strokeOpacity={0.6} />
      {/* Full flowing skirt */}
      <path d="M44,78 Q60,92 76,78 L96,155 L24,155 Z" fill="white" fillOpacity={0.85} />
      {/* Ruffle suggestion on skirt */}
      <path d="M30,112 Q60,102 90,112" fill="none" stroke="#9f1239" strokeWidth="1.5" strokeOpacity={0.3} />
      <path d="M26,128 Q60,118 94,128" fill="none" stroke="#9f1239" strokeWidth="1.5" strokeOpacity={0.25} />
      <path d="M28,144 Q60,134 92,144" fill="none" stroke="#9f1239" strokeWidth="1.5" strokeOpacity={0.2} />
    </svg>
  )
}

function ClassicIllustration() {
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden>
      {/* Head */}
      <circle cx="60" cy="18" r="13" fill="white" fillOpacity={0.85} />
      {/* Symmetrical blazer — moderate proportions */}
      <rect x="32" y="32" width="56" height="78" rx="4" fill="white" fillOpacity={0.88} />
      {/* Lapels — perfectly symmetrical */}
      <path d="M60,46 L42,66" stroke="#1e3a5f" strokeWidth="2.5" fill="none" />
      <path d="M60,46 L78,66" stroke="#1e3a5f" strokeWidth="2.5" fill="none" />
      {/* Refined button detail */}
      <circle cx="60" cy="74" r="2.5" fill="#1e3a5f" fillOpacity={0.5} />
      <circle cx="60" cy="86" r="2.5" fill="#1e3a5f" fillOpacity={0.5} />
      <circle cx="60" cy="98" r="2.5" fill="#1e3a5f" fillOpacity={0.5} />
      {/* Tailored trousers */}
      <rect x="36" y="108" width="22" height="48" rx="3" fill="white" fillOpacity={0.75} />
      <rect x="62" y="108" width="22" height="48" rx="3" fill="white" fillOpacity={0.75} />
      {/* Centre crease */}
      <line x1="47" y1="110" x2="47" y2="154" stroke="#1e3a5f" strokeWidth="1" strokeOpacity={0.3} />
      <line x1="73" y1="110" x2="73" y2="154" stroke="#1e3a5f" strokeWidth="1" strokeOpacity={0.3} />
    </svg>
  )
}

function GamineIllustration() {
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden>
      {/* Head */}
      <circle cx="60" cy="18" r="13" fill="white" fillOpacity={0.9} />
      {/* Cropped contrast jacket — top block */}
      <rect x="28" y="32" width="64" height="58" rx="4" fill="white" fillOpacity={0.92} />
      {/* Contrast block — left trouser (dark) */}
      <rect x="22" y="90" width="33" height="65" rx="5" fill="#c4b5fd" fillOpacity={0.85} />
      {/* Contrast block — right trouser (light) */}
      <rect x="65" y="90" width="33" height="65" rx="5" fill="white" fillOpacity={0.9} />
      {/* Collar detail */}
      <path d="M60,42 L50,56" stroke="#4c1d95" strokeWidth="2.5" fill="none" />
      <path d="M60,42 L70,56" stroke="#4c1d95" strokeWidth="2.5" fill="none" />
      {/* Playful pocket square */}
      <rect x="76" y="42" width="10" height="8" rx="1" fill="#a78bfa" fillOpacity={0.6} />
    </svg>
  )
}

function EtherealIllustration() {
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden>
      {/* Head */}
      <circle cx="60" cy="16" r="13" fill="#7c3aed" fillOpacity={0.5} />
      {/* Flowing gown — multiple transparent layers */}
      <path d="M42,30 L78,30 L90,155 L30,155 Z" fill="#7c3aed" fillOpacity={0.25} />
      <path d="M46,30 L74,30 L84,155 L36,155 Z" fill="white" fillOpacity={0.55} />
      {/* Second flowing layer */}
      <path d="M50,65 Q60,55 70,65 L80,155 L40,155 Z" fill="white" fillOpacity={0.35} />
      {/* Delicate top layer */}
      <path d="M48,50 Q60,38 72,50 L76,155 L44,155 Z" fill="white" fillOpacity={0.2} />
      {/* Floating sparkle dots */}
      <circle cx="20" cy="72" r="2.5" fill="#7c3aed" fillOpacity={0.5} />
      <circle cx="100" cy="60" r="2" fill="#7c3aed" fillOpacity={0.4} />
      <circle cx="14" cy="120" r="3" fill="#7c3aed" fillOpacity={0.35} />
      <circle cx="106" cy="110" r="3" fill="#7c3aed" fillOpacity={0.35} />
      <circle cx="108" cy="80" r="1.5" fill="#7c3aed" fillOpacity={0.3} />
      <circle cx="12" cy="95" r="1.5" fill="#7c3aed" fillOpacity={0.3} />
    </svg>
  )
}

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  dramatic: <DramaticIllustration />,
  natural: <NaturalIllustration />,
  romantic: <RomanticIllustration />,
  classic: <ClassicIllustration />,
  gamine: <GamineIllustration />,
  ethereal: <EtherealIllustration />,
}

const CARD_BG: Record<string, string> = {
  dramatic: 'bg-gradient-to-b from-slate-900 via-slate-800 to-zinc-800',
  natural: 'bg-gradient-to-b from-amber-800 via-amber-700 to-orange-700',
  romantic: 'bg-gradient-to-b from-rose-500 via-pink-400 to-rose-300',
  classic: 'bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-800',
  gamine: 'bg-gradient-to-b from-violet-800 via-indigo-700 to-purple-700',
  ethereal: 'bg-gradient-to-b from-purple-100 via-violet-50 to-pink-50',
}

const CARD_TEXT: Record<string, string> = {
  dramatic: 'text-slate-100',
  natural: 'text-amber-50',
  romantic: 'text-rose-950',
  classic: 'text-blue-50',
  gamine: 'text-violet-50',
  ethereal: 'text-purple-900',
}

const CARD_KEYWORD_BG: Record<string, string> = {
  dramatic: 'bg-white/10 text-white',
  natural: 'bg-amber-900/30 text-amber-100',
  romantic: 'bg-rose-900/15 text-rose-900',
  classic: 'bg-white/10 text-blue-100',
  gamine: 'bg-white/10 text-violet-100',
  ethereal: 'bg-purple-200/50 text-purple-800',
}

// ─── Results Component ──────────────────────────────────────────────────────

function EssenceResults({
  result,
  onRetake,
  onContinue,
}: {
  result: EssenceResult
  onRetake: () => void
  onContinue: (result: EssenceResult) => void
}) {
  const primary = ESSENCE_INFO[result.primary]
  const secondary = result.secondary ? ESSENCE_INFO[result.secondary] : null

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" />
          Your Style Essence
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{primary.name}</h2>
        <p className="text-muted-foreground">{primary.tagline}</p>
      </div>

      {/* Primary essence card */}
      <div className={cn('rounded-2xl overflow-hidden', `bg-gradient-to-br ${primary.gradient}`)}>
        <div className="grid grid-cols-[140px_1fr] min-h-[200px]">
          <div className="p-4 flex items-center justify-center">
            {ILLUSTRATIONS[result.primary]}
          </div>
          <div className={cn('p-5 flex flex-col justify-center', primary.textColor)}>
            <p className="text-sm font-semibold uppercase tracking-wider opacity-70 mb-2">
              Your primary essence
            </p>
            <h3 className="text-2xl font-bold mb-2">{primary.name}</h3>
            <p className="text-sm leading-relaxed opacity-85">{primary.description}</p>
          </div>
        </div>
      </div>

      {/* Secondary essence — shown if strong enough */}
      {secondary && result.secondary && (
        <div className={cn('rounded-xl overflow-hidden border', `bg-gradient-to-br ${secondary.gradient}`)}>
          <div className="grid grid-cols-[100px_1fr] min-h-[130px]">
            <div className="p-3 flex items-center justify-center opacity-90">
              {ILLUSTRATIONS[result.secondary]}
            </div>
            <div className={cn('p-4 flex flex-col justify-center', secondary.textColor)}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">
                With a secondary touch of
              </p>
              <h3 className="text-xl font-bold mb-1">{secondary.name}</h3>
              <p className="text-sm opacity-75">{secondary.tagline}</p>
            </div>
          </div>
        </div>
      )}

      {/* Style guide pills */}
      <div className="bg-secondary/40 rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-sm">Your style blueprint</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Your best silhouettes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {primary.styleGuide.silhouettes.map(s => (
                <span key={s} className="text-xs bg-background border rounded-full px-2.5 py-1">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Your best fabrics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {primary.styleGuide.fabrics.map(f => (
                <span key={f} className="text-xs bg-background border rounded-full px-2.5 py-1">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Style icons
            </p>
            <div className="flex flex-wrap gap-1.5">
              {primary.styleGuide.celebrities.map(c => (
                <span key={c} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Avoid
            </p>
            <div className="flex flex-wrap gap-1.5">
              {primary.styleGuide.avoid.slice(0, 3).map(a => (
                <span key={a} className="text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-full px-2.5 py-1">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetake} className="flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" />
          Retake quiz
        </Button>
        <Button onClick={() => onContinue(result)} className="flex-1">
          See my full style profile
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Quiz Component ────────────────────────────────────────────────────

interface EssenceQuizProps {
  onComplete: (result: EssenceResult) => void
  onSkip?: () => void
}

export function EssenceQuiz({ onComplete, onSkip }: EssenceQuizProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<EssenceResult | null>(null)
  const [animating, setAnimating] = useState(false)

  const question = QUIZ_QUESTIONS[currentQ]
  const isLast = currentQ === QUIZ_QUESTIONS.length - 1
  const selectedId = answers[question.id]
  const progress = ((currentQ + (selectedId ? 1 : 0)) / QUIZ_QUESTIONS.length) * 100

  function selectOption(optionId: string) {
    setAnswers(prev => ({ ...prev, [question.id]: optionId }))
  }

  function goNext() {
    if (!selectedId || animating) return
    if (isLast) {
      const finalAnswers = { ...answers, [question.id]: selectedId }
      setAnswers(finalAnswers)
      setResult(calculateEssence(finalAnswers))
      return
    }
    setAnimating(true)
    setTimeout(() => {
      setCurrentQ(q => q + 1)
      setAnimating(false)
    }, 200)
  }

  function goBack() {
    if (currentQ === 0 || animating) return
    setAnimating(true)
    setTimeout(() => {
      setCurrentQ(q => q - 1)
      setAnimating(false)
    }, 200)
  }

  function retake() {
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
  }

  if (result) {
    return (
      <EssenceResults
        result={result}
        onRetake={retake}
        onContinue={onComplete}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Style Essence
            </span>
            <span className="text-xs text-muted-foreground">
              {currentQ + 1} of {QUIZ_QUESTIONS.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Question */}
      <div
        className={cn(
          'transition-opacity duration-200',
          animating ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div className="mb-1">
          <h2 className="text-xl font-bold tracking-tight">{question.question}</h2>
          <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
        </div>

        {/* Options — 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {question.options.map(option => {
            const isSelected = selectedId === option.id

            return (
              <button
                key={option.id}
                onClick={() => selectOption(option.id)}
                className={cn(
                  'relative rounded-2xl overflow-hidden text-left transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected
                    ? 'ring-3 ring-primary shadow-lg scale-[1.02]'
                    : 'hover:scale-[1.01] hover:shadow-md ring-1 ring-border',
                )}
                aria-pressed={isSelected}
              >
                {/* Illustration area */}
                <div className={cn('h-40 sm:h-48 w-full', CARD_BG[option.illustration])}>
                  <div className="w-full h-full p-3">
                    {ILLUSTRATIONS[option.illustration]}
                  </div>
                </div>

                {/* Label area */}
                <div className={cn('p-3 pb-3.5', CARD_BG[option.illustration])}>
                  <div className={cn('font-semibold text-sm leading-tight', CARD_TEXT[option.illustration])}>
                    {option.label}
                  </div>
                  <div className={cn('text-xs mt-0.5 opacity-70 leading-tight', CARD_TEXT[option.illustration])}>
                    {option.sublabel}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.keywords.map(k => (
                      <span
                        key={k}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          CARD_KEYWORD_BG[option.illustration]
                        )}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={currentQ === 0}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={goNext}
          disabled={!selectedId}
          className="flex items-center gap-1.5 px-6"
        >
          {isLast ? (
            <>
              <Sparkles className="w-4 h-4" />
              See my essence
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
