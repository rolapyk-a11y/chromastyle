'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraCapture } from '@/components/dashboard/camera-capture'
import { AnalysisResults } from '@/components/dashboard/analysis-results'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Sparkles } from 'lucide-react'
import { ColorAnalysis } from '@/lib/types'

export default function AnalyzePage() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null)

  async function handleCapture(imageData: string) {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image')
      }

      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleReset() {
    setAnalysis(null)
    setError(null)
  }

  function handleContinue() {
    router.push('/dashboard/wardrobe')
  }

  // Show results if we have an analysis
  if (analysis) {
    return (
      <AnalysisResults 
        analysis={analysis} 
        onReset={handleReset}
        onContinue={handleContinue}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Palette className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Color Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Take a photo to discover your seasonal color palette
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-destructive-foreground">{error}</p>
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
              <div className="relative">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold">Analyzing your colors...</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI is examining your skin tone, eye color, and features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
