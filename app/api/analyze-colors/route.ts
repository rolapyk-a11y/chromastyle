import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MOCK_ANALYSIS = {
  season: 'spring' as const,
  sub_season: 'light-spring' as const,
  skin_undertone: 'warm' as const,
  eye_color: 'Blue-grey with warm golden flecks',
  hair_color: 'Medium golden brown',
  best_colors: [
    '#F4A460', '#DEB887', '#87CEEB', '#90EE90', '#FFD700',
    '#FFA07A', '#98FB98', '#FFDAB9', '#B0E0E6', '#F0E68C',
    '#E6B800', '#C8A96E'
  ],
  avoid_colors: ['#000000', '#1C1C1C', '#800000', '#4B0082', '#2F4F4F'],
  eye_enhancing_colors: ['#87CEEB', '#4682B4', '#B0C4DE', '#6495ED'],
  style_essence: 'natural' as const,
  analysis_details: {
    season_confidence: 82,
    skin_analysis: 'Warm, peachy undertones with a light-to-medium depth. The skin has a golden quality that responds best to warm, light colours rather than stark contrast.',
    eye_analysis: 'Blue-grey eyes with warm golden flecks — typical of a Light Spring. These eyes come alive with soft blues and warm corals nearby.',
    hair_analysis: 'Medium golden brown with natural warm highlights. The hair sits in the light-to-medium depth range, confirming the Light Spring season.',
    overall_recommendation: 'Your Light Spring palette is built on warmth and lightness. Stick to colours that feel sunny and fresh — think peach, camel, warm beige, sky blue, and soft gold.',
    style_tips: [
      'Wear peach or warm coral near your face — it will make your skin glow.',
      'Navy and black are too heavy — swap for camel, warm tan, or soft navy.',
      'Gold jewellery suits you far better than silver.',
      'A light khaki or warm olive works as a neutral instead of grey.',
      'In formal settings, a warm off-white shirt beats stark white.'
    ]
  }
}

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
  style_essence: z.enum(['dramatic', 'gamine', 'natural', 'classic', 'romantic', 'ingenue', 'angelic'])
    .describe('Style essence based on physical features: dramatic=tall/angular/striking, gamine=short/compact/playful, natural=sturdy/casual/easy-going, classic=symmetrical/balanced/refined, romantic=soft/rounded/sensual, ingenue=delicate/youthful/gentle, angelic=slim/tall/ethereal'),
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

    // --- MOCK MODE ---
    if (process.env.MOCK_AI === 'true') {
      const { style_essence, ...analysisData } = MOCK_ANALYSIS

      const { data: analysis, error: dbError } = await supabase
        .from('color_analyses')
        .insert({ user_id: user.id, photo_url: imageData, ...analysisData })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        return Response.json({ error: 'Failed to save analysis' }, { status: 500 })
      }

      // Save essence to profile
      await supabase
        .from('profiles')
        .upsert({ id: user.id, style_essence, updated_at: new Date().toISOString() })

      return Response.json({ analysis, style_essence })
    }
    // --- END MOCK MODE ---

    const base64Data = imageData.split(',')[1]

    const { output } = await generateText({
      model: google('gemini-3.5-flash'),
      output: Output.object({ schema: colorAnalysisSchema }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert in both seasonal colour analysis and the 7 style essences system for men's fashion.

Analyze this photo and determine:

**COLOUR SEASON** (using 12-season system):
1. Skin undertone: warm (golden/peachy) vs cool (pink/blue) vs neutral
2. Eye colour and depth
3. Hair colour and warmth
4. Overall contrast level

**STYLE ESSENCE** (based on physical features visible in the photo):
- dramatic: tall, angular, sharp features, striking presence
- gamine: compact, boyish, youthful, energetic features
- natural: sturdy build, broad/open face, easy-going appearance
- classic: symmetrical, balanced, even features, refined look
- romantic: soft rounded features, full face, sensual quality
- ingenue: delicate, youthful, gentle features, approachable
- angelic: slim, fine-boned, oval face, ethereal quality

Provide hex color codes wearable in men's clothing.`,
            },
            { type: 'image', image: base64Data },
          ],
        },
      ],
    })

    if (!output) {
      return Response.json({ error: 'Failed to analyze image' }, { status: 500 })
    }

    const { style_essence, ...analysisOutput } = output

    // Save colour analysis
    const { data: analysis, error: dbError } = await supabase
      .from('color_analyses')
      .insert({
        user_id: user.id,
        photo_url: imageData,
        season: analysisOutput.season,
        sub_season: analysisOutput.sub_season,
        skin_undertone: analysisOutput.skin_undertone,
        eye_color: analysisOutput.eye_color,
        hair_color: analysisOutput.hair_color,
        best_colors: analysisOutput.best_colors,
        avoid_colors: analysisOutput.avoid_colors,
        eye_enhancing_colors: analysisOutput.eye_enhancing_colors,
        analysis_details: analysisOutput.analysis_details,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return Response.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    // Save essence to profile
    await supabase
      .from('profiles')
      .upsert({ id: user.id, style_essence, updated_at: new Date().toISOString() })

    return Response.json({ analysis, style_essence })
  } catch (error) {
    console.error('Color analysis error:', error)
    return Response.json({ error: 'An error occurred during analysis' }, { status: 500 })
  }
}
