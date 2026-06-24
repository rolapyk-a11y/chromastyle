'use client'

import type { UserWardrobeItem, ItemCategory } from '@/lib/types'

const SKIN  = '#e8d5c4'
const EMPTY = '#e2e0de'

const TORSO_CATS: ItemCategory[] = ['jacket', 'top']
const LOWER_CATS: ItemCategory[] = ['bottom']
const FEET_CATS:  ItemCategory[] = ['shoes']

function firstColor(items: UserWardrobeItem[], categories: ItemCategory[]): string | null {
  for (const cat of categories) {
    const item = items.find(i => i.category === cat)
    if (item) return item.color_hex
  }
  return null
}

interface MannequinViewerProps {
  items: UserWardrobeItem[]
  className?: string
}

export function MannequinViewer({ items, className = 'w-20 h-auto' }: MannequinViewerProps) {
  const torsoColor = firstColor(items, TORSO_CATS) ?? EMPTY
  const lowerColor = firstColor(items, LOWER_CATS) ?? EMPTY
  const feetColor  = firstColor(items, FEET_CATS)  ?? EMPTY

  const jacket = items.find(i => i.category === 'jacket')
  const top    = items.find(i => i.category === 'top')
  // Show top colour as collar/cuffs when both jacket and top are selected
  const collarColor = (jacket && top) ? top.color_hex : null

  return (
    <svg
      viewBox="0 0 100 218"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Outfit mannequin preview"
      role="img"
    >
      {/* ── Lower body (drawn first — behind torso overlap at waist) ── */}
      <path
        d="M 18,124 L 82,124 L 78,196 L 65,197 L 58,158 L 42,158 L 35,197 L 22,196 Z"
        fill={lowerColor}
      />

      {/* ── Shoes ── */}
      <ellipse cx="30" cy="204" rx="12" ry="5" fill={feetColor} />
      <ellipse cx="70" cy="204" rx="12" ry="5" fill={feetColor} />

      {/* ── Torso with sleeves (top or jacket) ── */}
      <path
        d="M 50,34 L 26,41 L 14,44 L 10,90 L 18,92 L 18,124 L 82,124 L 82,92 L 90,90 L 86,44 L 74,41 Z"
        fill={torsoColor}
      />

      {/* ── Collar: shows top colour peeking out from open jacket ── */}
      {collarColor && (
        <path
          d="M 44,34 L 50,45 L 56,34 L 53,47 L 50,51 L 47,47 Z"
          fill={collarColor}
        />
      )}

      {/* ── Neck (always skin-toned) ── */}
      <rect x="46" y="25" width="8" height="9" rx="2" fill={SKIN} />

      {/* ── Head ── */}
      <circle cx="50" cy="13" r="12" fill={SKIN} />

      {/* ── Subtle outline overlay so the shape reads even with light colours ── */}
      <g fill="none" stroke="black" strokeWidth="0.7" opacity="0.13">
        <circle cx="50" cy="13" r="12" />
        <rect x="46" y="25" width="8" height="9" rx="2" />
        <path d="M 50,34 L 26,41 L 14,44 L 10,90 L 18,92 L 18,124 L 82,124 L 82,92 L 90,90 L 86,44 L 74,41 Z" />
        <path d="M 18,124 L 82,124 L 78,196 L 65,197 L 58,158 L 42,158 L 35,197 L 22,196 Z" />
        <ellipse cx="30" cy="204" rx="12" ry="5" />
        <ellipse cx="70" cy="204" rx="12" ry="5" />
      </g>
    </svg>
  )
}
