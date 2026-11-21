'use client'

// One closet for the whole app. "My Wardrobe" (outfit engine, try-on) and "Mit skab"
// share the same clothes: signed-in users read and write the Supabase closet through
// /api/closet, guests keep using localStorage exactly as before.

import type { ItemCategory, UserItem, UserWardrobeItem } from '@/lib/types'
import { addLocalWardrobeItem, loadLocalWardrobe, removeLocalWardrobeItem } from '@/lib/outfitEngine'

type Mode = 'remote' | 'local'
let mode: Mode | null = null

const TO_ENGINE: Record<UserItem['category'], ItemCategory> = {
  top: 'top',
  bottom: 'bottom',
  outerwear: 'jacket',
  shoes: 'shoes',
  accessory: 'accessory',
}
const TO_CLOSET: Record<ItemCategory, UserItem['category']> = {
  top: 'top',
  bottom: 'bottom',
  jacket: 'outerwear',
  shoes: 'shoes',
  accessory: 'accessory',
}

export function closetToWardrobe(item: UserItem): UserWardrobeItem {
  return {
    id: item.id,
    user_id: item.user_id,
    name: item.name,
    category: TO_ENGINE[item.category] ?? 'top',
    color_hex: item.colors?.[0] ?? '#888888',
    color_name: item.subcategory ?? item.name,
    ...(item.fabric ? { fabric: item.fabric } : {}),
    ...(item.cut ? { cut: item.cut } : {}),
    ...(item.brand ? { brand: item.brand } : {}),
    ...(item.image_url ? { image_url: item.image_url } : {}),
    created_at: item.created_at,
  }
}

/** Loads the wardrobe: the user's Supabase closet when signed in, otherwise this browser's. */
export async function loadWardrobe(): Promise<{ items: UserWardrobeItem[]; remote: boolean }> {
  try {
    const res = await fetch('/api/closet', { cache: 'no-store' })
    if (res.ok) {
      const { items } = (await res.json()) as { items: UserItem[] }
      mode = 'remote'
      return { items: items.map(closetToWardrobe), remote: true }
    }
  } catch {
    /* offline or not signed in – fall back to this browser */
  }
  mode = 'local'
  return { items: loadLocalWardrobe(), remote: false }
}

export async function addWardrobeItem(item: UserWardrobeItem): Promise<void> {
  if (mode !== 'remote') return addLocalWardrobeItem(item)

  const image = item.image_url
  const res = await fetch('/api/closet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: item.name,
      category: TO_CLOSET[item.category],
      brand: item.brand ?? null,
      colors: /^#[0-9a-f]{6}$/i.test(item.color_hex) ? [item.color_hex.toUpperCase()] : [],
      fabric: item.fabric ?? null,
      cut: item.cut ?? null,
      ...(image?.startsWith('data:image/') ? { imageData: image } : {}),
      ...(image?.startsWith('http') ? { external_image_url: image } : {}),
    }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Kunne ikke gemme tøjet')
  }
}

export async function removeWardrobeItem(id: string): Promise<void> {
  if (mode !== 'remote') return removeLocalWardrobeItem(id)
  const res = await fetch(`/api/closet/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Kunne ikke slette tøjet')
}

/** Items a signed-in user still has in this browser from before they had an account. */
export function localItemsToImport(): UserWardrobeItem[] {
  return mode === 'remote' ? loadLocalWardrobe() : []
}
