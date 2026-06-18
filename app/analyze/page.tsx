'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraCapture } from '@/components/dashboard/camera-capture'
import { AnalysisResults } from '@/components/dashboard/analysis-results'
import { EssenceQuiz } from '@/components/dashboard/essence-quiz'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, LogIn, ArrowRight } from 'lucide-react'
import type { ColorAnalysis } from '@/lib/types'
import type { EssenceResult } from '@/lib/essenceData'
import { analyzeColorsInBrowser, FaceNotDetectedError } from '@/lib/clientColorAnalysis'

type PageStep = 'undertone-question' | 'capture' | 'results' | 'essence-quiz'
type Undertone = 'warm' | 'cool'

// ─── Wrist vein illustrations ─────────────────────────────────────────────────

function WarmWrist() {
  return (
    <svg viewBox="0 0 120 180" className="w-full h-full" aria-hidden>
      {/* Arm shape */}
      <rect x="28" y="10" width="64" height="160" rx="32" fill="#D4956A" />
      {/* Wrist crease */}
      <path d="M30 118 Q60 122 90 118" stroke="#B8784E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Green veins */}
      <path d="M52 30 Q50 80 48 115" stroke="#4A7C59" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M60 25 Q60 75 58 115" stroke="#5A8C69" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65"/>
      <path d="M70 32 Q68 82 66 115" stroke="#4A7C59" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M52 115 Q54 135 50 155" stroke="#4A7C59" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55"/>
      <path d="M60 115 Q61 135 59 155" stroke="#5A8C69" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function CoolWrist() {
  return (
    <svg viewBox="0 0 120 180" className="w-full h-full" aria-hidden>
      {/* Arm shape */}
      <rect x="28" y="10" width="64" height="160" rx="32" fill="#C8A99A" />
      {/* Wrist crease */}
      <path d="M30 118 Q60 122 90 118" stroke="#A8897A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Blue/purple veins */}
      <path d="M52 30 Q50 80 48 115" stroke="#4A5A9A" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M60 25 Q60 75 58 115" stroke="#6A4A8A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65"/>
      <path d="M70 32 Q68 82 66 115" stroke="#4A5A9A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M52 115 Q54 135 50 155" stroke="#5A4A8A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55"/>
      <path d="M60 115 Q61 135 59 155" stroke="#4A5A9A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const router = useRouter()
  const [step, setStep] = useState<PageStep>('undertone-question')
  const [undertone, setUndertone] = useState<Undertone | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null)
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false)

  function handleUndertoneSelect(choice: Undertone) {
    setUndertone(choice)
    setStep('capture')
  }

  async function handleCapture(imageData: string) {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await analyzeColorsInBrowser(imageData, undertone ?? undefined)

      const fullAnalysis: ColorAnalysis = {
        ...result,
        id: `guest-${Date.now()}`,
        user_id: 'guest',
        photo_url: '',
        created_at: new Date().toISOString(),
      }

      localStorage.setItem('chromastyle_analysis', JSON.stringify(fullAnalysis))
      setAnalysis(fullAnalysis)
      setStep('results')
      setShowSignUpPrompt(true)
    } catch (err) {
      if (err instanceof FaceNotDetectedError) {
        setError('No face detected. Please try again: face the camera directly, make sure your face is well-lit, and keep your whole face in frame.')
      } else {
        setError(err instanceof Error ? err.message : 'Could not analyse your photo. Please try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  function handleReset() {
    setAnalysis(null)
    setUndertone(null)
    setStep('undertone-question')
    setError(null)
    setShowSignUpPrompt(false)
  }

  // ── Undertone question ───────────────────────────────────────────────────────
  if (step === 'undertone-question') {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary mb-2">
            <Sparkles className="w-3 h-3" /> Step 1 of 2
          </div>
          <h1 className="text-2xl font-bold">Quick check first</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hold your wrist under a natural light — near a window works best.
            Look at the veins on the inside of your wrist.
            Which colour do they look like?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Warm option */}
          <button
            onClick={() => handleUndertoneSelect('warm')}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-4 transition-all hover:border-amber-500 hover:bg-amber-500/5 active:scale-95"
          >
            <div className="w-24 h-36">
              <WarmWrist />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Greenish</p>
              <p className="text-xs text-muted-foreground mt-0.5">veins look green</p>
            </div>
            <div className="w-full rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-center">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">→ Warm undertone</p>
            </div>
          </button>

          {/* Cool option */}
          <button
            onClick={() => handleUndertoneSelect('cool')}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-4 transition-all hover:border-blue-500 hover:bg-blue-500/5 active:scale-95"
          >
            <div className="w-24 h-36">
              <CoolWrist />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Blue / Purple</p>
              <p className="text-xs text-muted-foreground mt-0.5">veins look bluish</p>
            </div>
            <div className="w-full rounded-lg bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 text-center">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">→ Cool undertone</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Not sure? Look in natural light — not indoors under a lamp.
        </p>
      </div>
    )
  }

  // ── Essence quiz ─────────────────────────────────────────────────────────────
  if (step === 'essence-quiz') {
    return (
      <EssenceQuiz
        onComplete={(result) => {
          localStorage.setItem('chromastyle_essence', JSON.stringify(result))
          router.push('/wardrobe')
        }}
        onSkip={() => router.push('/wardrobe')}
      />
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (step === 'results' && analysis) {
    return (
      <div className="space-y-4">
        {showSignUpPrompt && (
          <Card className="border-primary/40 bg-primary/5 max-w-2xl mx-auto">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Save your results permanently</p>
                <p className="text-xs text-muted-foreground">Create a free account to access your palette any time.</p>
              </div>
              <Button size="sm" onClick={() => router.push('/auth/signup')}>
                <LogIn className="w-4 h-4 mr-2" />
                Sign up free
              </Button>
            </CardContent>
          </Card>
        )}
        <AnalysisResults
          analysis={analysis}
          onReset={handleReset}
          onContinue={() => router.push('/wardrobe')}
          onEssenceQuiz={() => setStep('essence-quiz')}
        />
      </div>
    )
  }

  // ── Camera capture ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary mb-2">
          <Sparkles className="w-3 h-3" />
          Step 2 of 2 — {undertone === 'warm' ? '🟡 Warm undertone confirmed' : '🔵 Cool undertone confirmed'}
        </div>
        <h1 className="text-2xl font-bold">Now take your photo</h1>
        <p className="text-muted-foreground text-sm">
          Face the camera directly in good light. Natural daylight gives the most accurate result.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-destructive-foreground text-sm">{error}</p>
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto" onClick={() => setStep('undertone-question')}>
              ← Start over
            </Button>
          </CardContent>
        </Card>
      )}

      <CameraCapture onCapture={handleCapture} isProcessing={isProcessing} />

      {isProcessing && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <Sparkles className="w-7 h-7 text-primary animate-pulse shrink-0" />
            <div>
              <p className="font-semibold text-sm">Analysing your colours…</p>
              <p className="text-xs text-muted-foreground">Detecting skin tone, hair, and eye colour</p>
            </div>
          </CardContent>
        </Card>
      )}

      <button
        onClick={() => setStep('undertone-question')}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline w-full text-center"
      >
        ← Change my undertone answer
      </button>
    </div>
  )
}
