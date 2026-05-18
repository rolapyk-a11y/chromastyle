'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraCapture } from '@/components/dashboard/camera-capture'
import { AnalysisResults } from '@/components/dashboard/analysis-results'
import { EssenceQuiz } from '@/components/dashboard/essence-quiz'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Palette, Sparkles, LogIn } from 'lucide-react'
import type { ColorAnalysis } from '@/lib/types'
import type { EssenceResult } from '@/lib/essenceData'
import { analyzeColorsInBrowser } from '@/lib/clientColorAnalysis'

type PageStep = 'capture' | 'results' | 'essence-quiz' | 'essence-results'

export default function AnalyzePage() {
  const router = useRouter()
  const [step, setStep] = useState<PageStep>('capture')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null)
  const [essenceResult, setEssenceResult] = useState<EssenceResult | null>(null)
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false)

  async function handleCapture(imageData: string) {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await analyzeColorsInBrowser(imageData)

      const fullAnalysis: ColorAnalysis = {
        ...result,
        id: `guest-${Date.now()}`,
        user_id: 'guest',
        photo_url: '',
        created_at: new Date().toISOString(),
      }

      // Persist for guest session
      localStorage.setItem('chromastyle_analysis', JSON.stringify(fullAnalysis))

      setAnalysis(fullAnalysis)
      setStep('results')
      setShowSignUpPrompt(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyse your photo. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleReset() {
    setAnalysis(null)
    setEssenceResult(null)
    setStep('capture')
    setError(null)
    setShowSignUpPrompt(false)
  }

  function handleContinue() {
    router.push('/dashboard/wardrobe')
  }

  function handleStartEssenceQuiz() {
    setStep('essence-quiz')
  }

  function handleEssenceComplete(result: EssenceResult) {
    setEssenceResult(result)
    localStorage.setItem('chromastyle_essence', JSON.stringify(result))
    setStep('essence-results')
  }

  function handleEssenceSkip() {
    router.push('/dashboard/wardrobe')
  }

  if (step === 'essence-quiz') {
    return (
      <EssenceQuiz
        onComplete={handleEssenceComplete}
        onSkip={handleEssenceSkip}
      />
    )
  }

  if (step === 'results' && analysis) {
    return (
      <div className="space-y-6">
        {showSignUpPrompt && (
          <Card className="border-primary/40 bg-primary/5 max-w-4xl mx-auto">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Save your results permanently</p>
                <p className="text-xs text-muted-foreground">Create a free account to save your colour analysis and access it any time.</p>
              </div>
              <Button size="sm" variant="default" onClick={() => router.push('/auth/signup')}>
                <LogIn className="w-4 h-4 mr-2" />
                Sign up free
              </Button>
            </CardContent>
          </Card>
        )}

        <AnalysisResults
          analysis={analysis}
          onReset={handleReset}
          onContinue={handleContinue}
          onEssenceQuiz={handleStartEssenceQuiz}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Palette className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Colour Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Take a photo to discover your seasonal colour palette — free, no account needed
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-destructive-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <CameraCapture
        onCapture={handleCapture}
        isProcessing={isProcessing}
      />

      {isProcessing && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              <div>
                <h3 className="font-semibold">Analysing your colours…</h3>
                <p className="text-sm text-muted-foreground">
                  Detecting skin tone, hair, and eye colour — all in your browser
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
