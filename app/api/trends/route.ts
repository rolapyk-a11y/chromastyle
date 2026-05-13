import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch non-expired trends, newest first
    const { data: trends, error } = await supabase
      .from('fashion_trends')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Trends fetch error:', error)
      return Response.json({ error: 'Failed to fetch trends' }, { status: 500 })
    }

    return Response.json({ trends: trends || [], count: trends?.length || 0 })
  } catch (error) {
    console.error('Trends route error:', error)
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }
}
