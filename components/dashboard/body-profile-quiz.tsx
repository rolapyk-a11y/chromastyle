'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check, Ruler, Sparkles, RefreshCcw } from 'lucide-react'
import {
  BODY_QUESTIONS,
  fitTipsFor,
  bodyProfileSummary,
} from '@/lib/bodyGuide'
import type { BodyProfile } from '@/lib/types'

interface BodyProfileQuizProps {
  onComplete: (profile: BodyProfile) => void
  onSkip?: () => void
}

type Answers = Partial<Record<string, string>>

export function BodyProfileQuiz({ onComplete, onSkip }: BodyProfileQuizProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<BodyProfile | null>(null)
  const [animating, setAnimating] = useState(false)

  const question = BODY_QUESTIONS[currentQ]
  const isLast = currentQ === BODY_QUESTIONS.length - 1
  const selected = answers[question.field]
  const progress = ((currentQ + (selected ? 1 : 0)) / BODY_QUESTIONS.length) * 100

  function select(value: string) {
    setAnswers(prev => ({ ...prev, [question.field]: value }))
  }

  function goNext() {
    if (!selected || animating) return
    if (isLast) {
      const finalAnswers = { ...answers, [question.field]: selected }
      const profile: BodyProfile = {
        height: finalAnswers.height as BodyProfile['height'],
        shoulders: finalAnswers.shoulders as BodyProfile['shoulders'],
        proportion: finalAnswers.proportion as BodyProfile['proportion'],
        build: finalAnswers.build as BodyProfile['build'],
        created_at: new Date().toISOString(),
      }
      setResult(profile)
      return
    }
    setAnimating(true)
    setTimeout(() => { setCurrentQ(q => q + 1); setAnimating(false) }, 180)
  }

  function goBack() {
    if (currentQ === 0 || animating) return
    setAnimating(true)
    setTimeout(() => { setCurrentQ(q => q - 1); setAnimating(false) }, 180)
  }

  function retake() {
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (result) {
    const tips = fitTipsFor(result)
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
            <Ruler className="w-4 h-4 text-primary" />
            Your fit profile
          </div>
          <h2 className="text-2xl font-bold tracking-tight capitalize">{bodyProfileSummary(result)}</h2>
          <p className="text-muted-foreground text-sm">
            We&apos;ll now favour the cuts that flatter your proportions — in outfit
            scoring and product suggestions.
          </p>
        </div>

        <div className="bg-secondary/40 rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Your fit rules
          </h4>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={retake} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Retake
          </Button>
          <Button onClick={() => onComplete(result)} className="flex-1">
            Use my fit profile
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fit profile
            </span>
            <span className="text-xs text-muted-foreground">
              {currentQ + 1} of {BODY_QUESTIONS.length}
            </span>
          </div>
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

      {/* Question + options */}
      <div className={cn('transition-opacity duration-200', animating ? 'opacity-0' : 'opacity-100')}>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">{question.question}</h2>
          <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {question.options.map(option => {
            const isSelected = selected === option.value
            return (
              <button
                key={option.value}
                onClick={() => select(option.value)}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-border/80 hover:bg-secondary/30',
                )}
                aria-pressed={isSelected}
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.sublabel}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
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
        <Button variant="ghost" onClick={goBack} disabled={currentQ === 0} className="flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={goNext} disabled={!selected} className="flex items-center gap-1.5 px-6">
          {isLast ? (<><Sparkles className="w-4 h-4" /> See my fit profile</>) : (<>Next <ArrowRight className="w-4 h-4" /></>)}
        </Button>
      </div>
    </div>
  )
}
