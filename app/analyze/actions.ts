'use server'

import { createClient } from '@/lib/supabase/server'
import type { ColorAnalysis } from '@/lib/types'

export async function saveColorAnalysis(
  analysis: Omit<ColorAnalysis, 'id' | 'user_id' | 'created_at'>
): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('color_analyses')
    .insert({
      user_id: user.id,
      photo_url: analysis.photo_url ?? '',
      season: analysis.season,
      sub_season: analysis.sub_season,
      skin_undertone: analysis.skin_undertone,
      eye_color: analysis.eye_color ?? null,
      hair_color: analysis.hair_color ?? null,
      best_colors: analysis.best_colors,
      avoid_colors: analysis.avoid_colors,
      eye_enhancing_colors: analysis.eye_enhancing_colors,
      analysis_details: analysis.analysis_details ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('saveColorAnalysis error:', error)
    return null
  }

  return { id: data.id }
}
