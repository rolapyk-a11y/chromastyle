import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodyProfile = z.object({
  height: z.enum(['short', 'average', 'tall']),
  shoulders: z.enum(['narrow', 'average', 'broad']),
  proportion: z.enum(['long-torso', 'balanced', 'long-legs']),
  build: z.enum(['slim', 'average', 'athletic', 'fuller']),
  hips: z.enum(['narrow', 'average', 'wide']).optional(),
  created_at: z.string(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('profiles').select('body_profile').eq('id', user.id).maybeSingle()
  return Response.json({ profile: data?.body_profile ?? null })
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodyProfile.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Ugyldig profil' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, body_profile: parsed.data, updated_at: new Date().toISOString() })
  if (error) {
    console.error('Body profile save error:', error)
    return Response.json({ error: 'Kunne ikke gemme profilen' }, { status: 500 })
  }
  return Response.json({ profile: parsed.data })
}
