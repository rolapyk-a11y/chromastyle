'use client'

/**
 * Try-On Viewer (paper-doll, Phase 1a)
 *
 * Renders the body-type figure (MannequinViewer) as the base, then lays
 * background-removed garment PHOTOS over the matching body zones for any item
 * that has an image. Items with no photo keep showing their colour block from
 * the base figure — so it always renders, photo or not.
 */

import { useEffect, useState } from 'react'
import type { UserWardrobeItem, BodyProfile, ItemCategory } from '@/lib/types'
import { MannequinViewer } from './mannequin-viewer'
import { removeGarmentBackground } from '@/lib/backgroundRemoval'

// Zone boxes as % of the container (tuned to MannequinViewer's 100×230 viewBox).
const ZONES = {
  torso: { top: '13%', left: '12%', width: '76%', height: '42%' },
  lower: { top: '50%', left: '26%', width: '48%', height: '40%' },
  feet:  { top: '86%', left: '20%', width: '60%', height: '12%' },
} as const

// Which item fills each zone (jacket wins the torso over a top).
function pick(items: UserWardrobeItem[], cats: ItemCategory[]): UserWardrobeItem | undefined {
  for (const cat of cats) {
    const it = items.find(i => i.category === cat && i.image_url)
    if (it) return it
  }
  return undefined
}

interface TryOnViewerProps {
  items: UserWardrobeItem[]
  bodyProfile?: BodyProfile
  className?: string
}

export function TryOnViewer({ items, bodyProfile, className = 'w-20' }: TryOnViewerProps) {
  const zoneItems = {
    torso: pick(items, ['jacket', 'top']),
    lower: pick(items, ['bottom']),
    feet:  pick(items, ['shoes']),
  }

  // Resolve a background-removed cutout for each zone's photo.
  const [cutouts, setCutouts] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const sources: Array<[string, string]> = []
    for (const [zone, item] of Object.entries(zoneItems)) {
      if (item?.image_url) sources.push([zone, item.image_url])
    }
    sources.forEach(([zone, src]) => {
      removeGarmentBackground(src).then(out => {
        if (!cancelled) setCutouts(prev => (prev[zone] === out ? prev : { ...prev, [zone]: out }))
      })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneItems.torso?.image_url, zoneItems.lower?.image_url, zoneItems.feet?.image_url])

  return (
    <div className={`relative aspect-[100/230] ${className}`}>
      {/* Base body-type figure (colours show for any zone without a photo) */}
      <MannequinViewer items={items} bodyProfile={bodyProfile} className="absolute inset-0 w-full h-full" />

      {/* Garment photo overlays */}
      {(Object.keys(ZONES) as Array<keyof typeof ZONES>).map(zone => {
        const item = zoneItems[zone]
        const src = cutouts[zone]
        if (!item?.image_url || !src) return null
        return (
          <img
            key={zone}
            src={src}
            alt={item.name}
            className="absolute object-contain pointer-events-none"
            style={{ ...ZONES[zone] }}
          />
        )
      })}
    </div>
  )
}
