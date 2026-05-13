import { generateText, Output } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const colorAnalysisSchema = z.object({
  season: z.enum(['spring', 'summer', 'autumn', 'winter']),
  sub_season: z.enum([
    'light-spring', 'true-spring', 'warm-spring',
    'light-summer', 'true-summer', 'soft-summer',
    'soft-autumn', 'true-autumn', 'dark-autumn',
    'dark-winter', 'true-winter', 'clear-winter'
  ]),
  skin_undertone: z.enum(['warm', 'cool', 'neutral']),
  eye_color: z.string().nullable(),
  hair_color: z.string().nullable(),
  best_colors: z.array(z.string()).describe('Array of 10-12 hex color codes that look best on this person'),
  avoid_colors: z.array(z.string()).describe('Array of 5-6 hex color codes to avoid'),
  eye_enhancing_colors: z.array(z.string()).describe('Array of 4-5 hex colors that make the eyes pop'),
  analysis_details: z.object({
    season_confidence: z.number().min(0).max(100),
    skin_analysis: z.string(),
    eye_analysis: z.string(),
    hair_analysis: z.string(),
    overall_recommendation: z.string(),
    style_tips: z.array(z.string()).describe('3-5 specific style tips for this color season')
  })
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageData } = await req.json()

    if (!imageData) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    // Extract base64 data from data URL
    const base64Data = imageData.split(',')[1]
    const mediaType = imageData.split(';')[0].split(':')[1] || 'image/jpeg'

    const { output } = await generateText({
      model: 'anthropic/claude-sonnet-4.6',
      output: Output.object({
        schema: colorAnalysisSchema,
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert color analyst specializing in seasonal color analysis for men's fashion.

Analyze this photo of a person and determine their seasonal color palette using the 12-season color analysis system.

Consider the following carefully:
1. **Skin undertone**: Look at the vein color (blue/purple = cool, green = warm), how the skin reacts to silver vs gold jewelry, and the overall warmth or coolness of the skin.
2. **Eye color and patterns**: Note the primary color, any secondary colors or patterns, and the overall depth (light, medium, dark).
3. **Hair color**: Natural hair color, depth, and any warm or cool undertones.
4. **Contrast level**: The difference between skin, eyes, and hair (high contrast = Winter, low contrast = Summer, etc.)

Based on this analysis:
- Determine the main season (Spring, Summer, Autumn, Winter)
- Determine the sub-season (e.g., Light Spring, True Autumn, Dark Winter, etc.)
- Identify the skin undertone (warm, cool, neutral)
- Provide specific hex color codes that will:
  - Best complement this person's coloring (best_colors)
  - Should be avoided as they will wash out or clash (avoid_colors)
  - Specifically enhance and bring out the eye color (eye_enhancing_colors)

For the hex colors, choose colors that are actually wearable in men's clothing - shirts, jackets, pants, suits, etc.

Provide detailed analysis and style tips specific to this person's coloring.`
            },
            {
              type: 'image',
              image: base64Data,
            }
          ],
        },
      ],
    })

    if (!output) {
      return Response.json({ error: 'Failed to analyze image' }, { status: 500 })
    }

    // Store the analysis in the database
    const { data: analysis, error: dbError } = await supabase
      .from('color_analyses')
      .insert({
        user_id: user.id,
        photo_url: imageData,
        season: output.season,
        sub_season: output.sub_season,
        skin_undertone: output.skin_undertone,
        eye_color: output.eye_color,
        hair_color: output.hair_color,
        best_colors: output.best_colors,
        avoid_colors: output.avoid_colors,
        eye_enhancing_colors: output.eye_enhancing_colors,
        analysis_details: output.analysis_details,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return Response.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    return Response.json({ analysis })
  } catch (error) {
    console.error('Color analysis error:', error)
    return Response.json(
      { error: 'An error occurred during analysis' },
      { status: 500 }
    )
  }
}
