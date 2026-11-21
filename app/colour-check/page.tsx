'use client'

/**
 * Colour Check
 *
 * Snap or upload a photo of any garment — in a shop, your wardrobe, anywhere —
 * and find out instantly whether its colour suits your season. Works off the
 * palette saved from the colour analysis; no catalog or sign-in needed.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CameraCapture } from '@/components/dashboard/camera-capture'
import { extractGarmentColour, checkColourAgainstPalette, type ColourCheckResult, type ColourVerdict } from '@/lib/colourCheck'
import type { ColorAnalysis } from '@/lib/types'
import { SUB_SEASON_INFO } from '@/lib/types'
import { Sparkles, RotateCcw, ArrowLeft } from 'lucide-react'

const VERDICT_STYLE: Record<ColourVerdict, { ring: string; chip: string; label: string }> = {
  perfect: { ring: 'ring-green-500',  chip: 'bg-green-500/10 text-green-700 dark:text-green-400',  label: 'Perfect' },
  good:    { ring: 'ring-blue-500',   chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',     label: 'Good' },
  okay:    { ring: 'ring-amber-500',  chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',  label: 'Okay' },
  avoid:   { ring: 'ring-red-500',    chip: 'bg-red-500/10 text-red-700 dark:text-red-400',         label: 'Not ideal' },
}

export default function ColourCheckPage() {
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ColourCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chromastyle_analysis')
      if (raw) setAnalysis(JSON.parse(raw) as ColorAnalysis)
    } catch {
      /* ignore */
    }
    setLoaded(true)
  }, [])

  async function handleCapture(imageData: string) {
    if (!analysis) return
    setIsProcessing(true)
    setError(null)
    try {
      const hex = await extractGarmentColour(imageData)
      setResult(checkColourAgainstPalette(hex, analysis))
    } catch {
      setError('Could not read the colour from that photo. Try again with the garment filling the frame.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Loading ──
  if (!loaded) {
    return <div className="max-w-lg mx-auto py-12 text-center text-muted-foreground">Loading…</div>
  }

  // ── No palette yet → send them to analysis first ──
  if (!analysis) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <Sparkles className="w-10 h-10 mx-auto text-primary opacity-60" />
        <h1 className="text-xl font-bold">Find your colours first</h1>
        <p className="text-sm text-muted-foreground">
          Colour Check compares a garment against your personal palette — so you need a colour analysis first.
          It takes about a minute.
        </p>
        <Button asChild>
          <Link href="/analyze">Start colour analysis</Link>
        </Button>
      </div>
    )
  }

  const seasonName = SUB_SEASON_INFO[analysis.sub_season]?.name ?? 'your season'

  return (
    <div className="max-w-lg mx-auto py-4 space-y-6">
      <div className="space-y-1">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Colour Check</h1>
        <p className="text-sm text-muted-foreground">
          Photograph any piece of clothing and see if its colour suits <span className="font-medium">{seasonName}</span>.
        </p>
      </div>

      {result ? (
        // ── Result ──
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div
                className={`w-20 h-20 rounded-2xl border border-border/40 shadow-sm ring-2 ${VERDICT_STYLE[result.verdict].ring}`}
                style={{ backgroundColor: result.hex }}
              />
              <div className="flex-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VERDICT_STYLE[result.verdict].chip}`}>
                  {VERDICT_STYLE[result.verdict].label} · {result.matchPercent}% match
                </span>
                <p className="text-lg font-bold mt-1">{result.headline}</p>
                <p className="text-xs text-muted-foreground font-mono">{result.hex}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-secondary/50 rounded-lg px-3 py-2.5">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{result.message}</p>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Closest colour in your palette:</span>
              <span
                className="w-6 h-6 rounded-md border border-border/40"
                style={{ backgroundColor: result.nearestBestHex }}
                title={result.nearestBestHex}
              />
            </div>

            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Check another item
            </Button>
          </CardContent>
        </Card>
      ) : (
        // ── Capture ──
        <>
          <CameraCapture
            onCapture={handleCapture}
            isProcessing={isProcessing}
            guideText="Fill the frame with the garment"
            actionLabel="Check this colour"
            processingLabel="Reading colour…"
            showFaceGuide={false}
            defaultFacingMode="environment"
            tipsTitle="For an accurate reading:"
            tips={[
              'Fill the frame with the fabric — avoid the background',
              'Use natural daylight; avoid yellow indoor bulbs',
              'Keep the fabric flat and out of shadow',
              'One colour at a time works best',
            ]}
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
        </>
      )}
    </div>
  )
}
