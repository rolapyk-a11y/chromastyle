import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Looks at a photo of one piece of clothing and suggests how to file it.
// Nothing is saved here – the user reviews and edits the suggestion first.

const itemSchema = z.object({
  name: z.string().describe('Short Danish name for the item, e.g. "Lyseblå oxfordskjorte"'),
  category: z.enum(['top', 'bottom', 'outerwear', 'shoes', 'accessory']),
  subcategory: z.string().describe('Danish item type, e.g. skjorte, t-shirt, chinos, jeans, sneakers, bælte'),
  colors: z.array(z.string()).describe('1-3 hex colour codes (#RRGGBB) of the garment itself, not the background, dominant colour first'),
  pattern: z.enum(['ensfarvet', 'stribet', 'ternet', 'mønstret', 'print']),
  style_tags: z.array(z.string()).describe('2-4 short English style tags, e.g. casual, smart-casual, formal, streetwear, outdoor'),
  occasions: z.array(z.enum(['everyday', 'work', 'party', 'date', 'outdoor'])).describe('1-3 occasions the item suits'),
})

const MOCK: z.infer<typeof itemSchema> = {
  name: 'Lyseblå oxfordskjorte',
  category: 'top',
  subcategory: 'skjorte',
  colors: ['#9EC3E6', '#FFFFFF'],
  pattern: 'ensfarvet',
  style_tags: ['smart-casual', 'classic'],
  occasions: ['work', 'everyday'],
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { imageData } = await req.json()
    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    if (process.env.MOCK_AI === 'true') return Response.json({ suggestion: MOCK })

    const { output } = await generateText({
      model: google('gemini-3.5-flash'),
      output: Output.object({ schema: itemSchema }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                "This is a photo of one piece of clothing or an accessory from a man's wardrobe. " +
                'Identify it and describe it so it can be filed in a digital closet. ' +
                'Colours must be accurate hex codes of the garment, ignoring background and lighting casts.',
            },
            { type: 'image', image: imageData.split(',')[1] },
          ],
        },
      ],
    })

    if (!output) return Response.json({ error: 'Kunne ikke genkende tøjet' }, { status: 500 })
    const colors = output.colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 3)
    return Response.json({ suggestion: { ...output, colors } })
  } catch (error) {
    console.error('Closet analyze error:', error)
    return Response.json({ error: 'Der skete en fejl under analysen' }, { status: 500 })
  }
}
