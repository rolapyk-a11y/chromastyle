'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveColorAnalysis } from '@/app/analyze/actions'
import type { ColorAnalysis } from '@/lib/types'

/**
 * Silently syncs a localStorage analysis to Supabase the first time the
 * wardrobe loads without a saved analysis. Triggers a page refresh so the
 * server-rendered wardrobe can pick up the newly saved sub_season and fetch
 * real products from SerpAPI.
 */
export function LocalAnalysisSync() {
  const router = useRouter()

  useEffect(() => {
    const raw = localStorage.getItem('chromastyle_analysis')
    if (!raw) return

    let analysis: ColorAnalysis
    try {
      analysis = JSON.parse(raw)
    } catch {
      return
    }

    if (!analysis?.sub_season) return

    saveColorAnalysis({
      photo_url: '',
      season: analysis.season,
      sub_season: analysis.sub_season,
      skin_undertone: analysis.skin_undertone,
      eye_color: analysis.eye_color ?? null,
      hair_color: analysis.hair_color ?? null,
      best_colors: analysis.best_colors ?? [],
      avoid_colors: analysis.avoid_colors ?? [],
      eye_enhancing_colors: analysis.eye_enhancing_colors ?? [],
      analysis_details: analysis.analysis_details ?? null,
    }).then((saved) => {
      if (saved?.id) {
        // Remove local copy so this sync only runs once, then reload
        localStorage.removeItem('chromastyle_analysis')
        router.refresh()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
