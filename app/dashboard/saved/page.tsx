import { createClient } from '@/lib/supabase/server'
import { SavedItemsClient } from '@/components/dashboard/saved-items-client'
import { ClothingItem, ColorAnalysis } from '@/lib/types'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's saved items with clothing details
  const { data: savedItems } = await supabase
    .from('saved_items')
    .select(`
      *,
      clothing_item:clothing_items(*)
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  // Get user's color analysis
  const { data: analyses } = await supabase
    .from('color_analyses')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const colorAnalysis = analyses?.[0] as ColorAnalysis | undefined

  // Extract clothing items from saved items
  const clothingItems = savedItems?.map(item => ({
    ...item.clothing_item,
    savedItemId: item.id
  })).filter(Boolean) as (ClothingItem & { savedItemId: string })[] || []

  return (
    <SavedItemsClient 
      savedItems={clothingItems}
      colorAnalysis={colorAnalysis}
    />
  )
}
