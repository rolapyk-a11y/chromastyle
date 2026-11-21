import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { essence } = await req.json()
    if (!essence) return Response.json({ error: 'No essence provided' }, { status: 400 })

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, style_essence: essence, updated_at: new Date().toISOString() })

    if (error) {
      console.error('Profile update error:', error)
      return Response.json({ error: 'Failed to save essence' }, { status: 500 })
    }

    return Response.json({ success: true, essence })
  } catch (error) {
    console.error('Essence save error:', error)
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }
}
