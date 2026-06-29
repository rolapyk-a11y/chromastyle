'use client'

import type { UserWardrobeItem, ItemCategory, BodyProfile } from '@/lib/types'

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

// ── Build silhouette geometry from the user's self-reported body profile ──
// Defaults (no profile) give an average build. Each axis nudges real coordinates
// so the figure actually resembles the wearer instead of a generic dummy.
function geometry(body?: BodyProfile) {
  const shoulders = body?.shoulders ?? 'average'
  const build     = body?.build ?? 'average'
  const proportion = body?.proportion ?? 'balanced'
  const height    = body?.height ?? 'average'

  const shoulderMul = ({ narrow: 0.82, average: 1, broad: 1.2 } as const)[shoulders]
  const buildShoulder = ({ slim: 0.92, average: 1, athletic: 1.1, fuller: 1.12 } as const)[build]
  const buildWaist = ({ slim: 0.78, average: 0.95, athletic: 0.78, fuller: 1.32 } as const)[build]
  const buildHip = ({ slim: 0.85, average: 1, athletic: 0.9, fuller: 1.28 } as const)[build]

  const CX = 50
  const shoulderHalf = 22 * shoulderMul * buildShoulder
  const waistHalf = 15 * buildWaist
  const hipHalf = 19 * buildHip

  const shoulderY = 36
  const waistY = ({ 'long-torso': 132, balanced: 120, 'long-legs': 109 } as const)[proportion]
  const legBottomY = ({ short: 192, average: 202, tall: 215 } as const)[height]

  const neckHalf = 4.5
  const crotchY = waistY + (legBottomY - waistY) * 0.42
  const legInner = 3.5
  const footW = Math.max(9, hipHalf * 0.6)

  return { CX, shoulderHalf, waistHalf, hipHalf, shoulderY, waistY, legBottomY, neckHalf, crotchY, legInner, footW }
}

interface MannequinViewerProps {
  items: UserWardrobeItem[]
  bodyProfile?: BodyProfile
  className?: string
}

export function MannequinViewer({ items, bodyProfile, className = 'w-20 h-auto' }: MannequinViewerProps) {
  const torsoColor = firstColor(items, TORSO_CATS) ?? EMPTY
  const lowerColor = firstColor(items, LOWER_CATS) ?? EMPTY
  const feetColor  = firstColor(items, FEET_CATS)  ?? EMPTY

  const jacket = items.find(i => i.category === 'jacket')
  const top    = items.find(i => i.category === 'top')
  const collarColor = (jacket && top) ? top.color_hex : null

  const g = geometry(bodyProfile)
  const { CX, shoulderHalf, waistHalf, hipHalf, shoulderY, waistY, legBottomY, neckHalf, crotchY, legInner, footW } = g

  // Path strings (reused for fill + outline)
  const torsoPath =
    `M ${CX - neckHalf},${shoulderY} ` +
    `L ${CX - shoulderHalf},${shoulderY + 3} ` +
    `L ${CX - waistHalf},${waistY} ` +
    `L ${CX + waistHalf},${waistY} ` +
    `L ${CX + shoulderHalf},${shoulderY + 3} ` +
    `L ${CX + neckHalf},${shoulderY} Z`

  const leftArm =
    `M ${CX - shoulderHalf},${shoulderY + 3} ` +
    `L ${CX - shoulderHalf - 4},${shoulderY + 8} ` +
    `L ${CX - waistHalf - 2},${waistY - 4} ` +
    `L ${CX - waistHalf + 2},${waistY - 8} Z`
  const rightArm =
    `M ${CX + shoulderHalf},${shoulderY + 3} ` +
    `L ${CX + shoulderHalf + 4},${shoulderY + 8} ` +
    `L ${CX + waistHalf + 2},${waistY - 4} ` +
    `L ${CX + waistHalf - 2},${waistY - 8} Z`

  const lowerPath =
    `M ${CX - hipHalf},${waistY} ` +
    `L ${CX + hipHalf},${waistY} ` +
    `L ${CX + hipHalf - 1},${legBottomY} ` +
    `L ${CX + legInner},${legBottomY} ` +
    `L ${CX},${crotchY} ` +
    `L ${CX - legInner},${legBottomY} ` +
    `L ${CX - hipHalf + 1},${legBottomY} Z`

  const leftFoot = { cx: CX - (hipHalf + legInner) / 2 + 1, cy: legBottomY + 3, rx: footW * 0.5, ry: 4 }
  const rightFoot = { cx: CX + (hipHalf + legInner) / 2 - 1, cy: legBottomY + 3, rx: footW * 0.5, ry: 4 }

  return (
    <svg
      viewBox="0 0 100 230"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Outfit on a figure matched to your body type"
      role="img"
    >
      {/* Lower body (behind torso) */}
      <path d={lowerPath} fill={lowerColor} />

      {/* Shoes */}
      <ellipse cx={leftFoot.cx} cy={leftFoot.cy} rx={leftFoot.rx} ry={leftFoot.ry} fill={feetColor} />
      <ellipse cx={rightFoot.cx} cy={rightFoot.cy} rx={rightFoot.rx} ry={rightFoot.ry} fill={feetColor} />

      {/* Arms (same fabric as torso) */}
      <path d={leftArm} fill={torsoColor} />
      <path d={rightArm} fill={torsoColor} />

      {/* Torso */}
      <path d={torsoPath} fill={torsoColor} />

      {/* Collar: top colour peeking from an open jacket */}
      {collarColor && (
        <path
          d={`M ${CX - 6},${shoulderY} L ${CX},${shoulderY + 11} L ${CX + 6},${shoulderY} L ${CX + 3},${shoulderY + 13} L ${CX},${shoulderY + 17} L ${CX - 3},${shoulderY + 13} Z`}
          fill={collarColor}
        />
      )}

      {/* Neck + head (skin) */}
      <rect x={CX - neckHalf} y={25} width={neckHalf * 2} height={shoulderY - 25} rx={2} fill={SKIN} />
      <circle cx={CX} cy={14} r={11} fill={SKIN} />

      {/* Outline so the shape reads even with pale colours */}
      <g fill="none" stroke="black" strokeWidth="0.7" opacity="0.13">
        <circle cx={CX} cy={14} r={11} />
        <path d={torsoPath} />
        <path d={leftArm} />
        <path d={rightArm} />
        <path d={lowerPath} />
        <ellipse cx={leftFoot.cx} cy={leftFoot.cy} rx={leftFoot.rx} ry={leftFoot.ry} />
        <ellipse cx={rightFoot.cx} cy={rightFoot.cy} rx={rightFoot.rx} ry={rightFoot.ry} />
      </g>
    </svg>
  )
}
