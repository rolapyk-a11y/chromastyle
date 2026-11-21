export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { EssenceQuiz } from '@/components/dashboard/essence-quiz'
import { StyleEssence } from '@/lib/types'

export default async function EssencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('style_essence')
    .eq('id', user?.id)
    .single()

  return (
    <div className="py-4">
      <EssenceQuiz existingEssence={profile?.style_essence as StyleEssence | null} />
    </div>
  )
}
