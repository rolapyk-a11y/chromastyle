'use client'

/**
 * Guest wardrobe page — no login required.
 * Reads the colour analysis the guest /analyze flow saved to localStorage
 * (`chromastyle_analysis`) and renders the wardrobe. The "My Wardrobe & Outfits"
 * tab is fully browser-based (localStorage + outfit engine), so it works without
 * Supabase or sign-in.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WardrobeClient } from '@/components/dashboard/wardrobe-client'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import type { ColorAnalysis } from '@/lib/types'

export default function GuestWardrobePage() {
  const [analysis, setAnalysis] = useState<ColorAnalysis | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chromastyle_analysis')
      if (raw) setAnalysis(JSON.parse(raw) as ColorAnalysis)
    } catch {
      // ignore malformed data
    }
    setLoaded(true)
  }, [])

  if (!loaded) return null

  if (!analysis) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12">
        <Sparkles className="w-10 h-10 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">No colour analysis yet</h1>
        <p className="text-muted-foreground text-sm">
          Run the free colour analysis first — then come back to build your wardrobe
          and get outfit suggestions matched to your season.
        </p>
        <Button asChild>
          <Link href="/analyze">Analyse my colours — free</Link>
        </Button>
      </div>
    )
  }

  return (
    <WardrobeClient
      colorAnalysis={analysis}
      clothingItems={[]}
      savedItemIds={[]}
      initialMainTab="my-wardrobe"
    />
  )
}
