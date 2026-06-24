'use client'

/**
 * Outfit Builder
 *
 * Manual, interactive counterpart to the auto-generated outfit suggestions.
 * The user taps items from their wardrobe to add them to a "current outfit";
 * a live compatibility score and styling tip update with every change, so they
 * can experiment with how their own pieces mix and look together.
 */

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, Check, RotateCcw, Shirt, ShoppingBag, Footprints, Layers, Star } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, SubSeason, OutfitCombo, BodyProfile } from '@/lib/types'
import { scoreOutfit } from '@/lib/outfitEngine'
import { MannequinViewer } from './mannequin-viewer'

const CATEGORY_ICONS: Record<ItemCategory, React.ReactNode> = {
  top:       <Shirt className="w-4 h-4" />,
  bottom:    <ShoppingBag className="w-4 h-4" />,
  shoes:     <Footprints className="w-4 h-4" />,
  jacket:    <Layers className="w-4 h-4" />,
  accessory: <Star className="w-4 h-4" />,
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  top: 'Tops', bottom: 'Bottoms', jacket: 'Jackets', shoes: 'Shoes', accessory: 'Accessories',
}

const CATEGORY_ORDER: ItemCategory[] = ['top', 'bottom', 'jacket', 'shoes', 'accessory']

const SCORE_COLOURS: Record<OutfitCombo['scoreLabel'], string> = {
  Great: 'text-green-600 dark:text-green-400 bg-green-500/10',
  Good:  'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  Okay:  'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  Clash: 'text-red-600 dark:text-red-400 bg-red-500/10',
}

interface OutfitBuilderProps {
  items: UserWardrobeItem[]
  subSeason: SubSeason | undefined
  bodyProfile?: BodyProfile
  onAddItem: () => void
}

export function OutfitBuilder({ items, subSeason, bodyProfile, onAddItem }: OutfitBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedItems = useMemo(
    () => selectedIds
      .map(id => items.find(i => i.id === id))
      .filter((i): i is UserWardrobeItem => Boolean(i)),
    [selectedIds, items],
  )

  const outfit = useMemo(
    () => subSeason ? scoreOutfit(selectedItems, subSeason, bodyProfile) : null,
    [selectedItems, subSeason, bodyProfile],
  )

  function toggle(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<ItemCategory, UserWardrobeItem[]>>(
    (acc, cat) => ({ ...acc, [cat]: items.filter(i => i.category === cat) }),
    {} as Record<ItemCategory, UserWardrobeItem[]>,
  )

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-3">
        <Sparkles className="w-8 h-8 mx-auto opacity-30" />
        <p className="text-sm">No items yet</p>
        <Button size="sm" variant="outline" onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-1" /> Add items to start building
        </Button>
      </div>
    )
  }

  const hasOutfit = selectedItems.length >= 2

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tap pieces to build an outfit and see how well they work together.
      </p>

      {/* ── Live outfit preview ── */}
      <Card className="border-primary/30 bg-primary/5 sticky top-2 z-10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your outfit</span>
            {hasOutfit && outfit && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SCORE_COLOURS[outfit.scoreLabel]}`}>
                {outfit.scoreLabel} — {outfit.score}/100
              </span>
            )}
          </div>

          {/* ── Mannequin + item list ── */}
          <div className="flex items-start gap-3">
            <MannequinViewer items={selectedItems} className="w-20 h-auto shrink-0" />
            <div className="flex-1 flex flex-col justify-center gap-1.5 py-1 min-h-[80px]">
              {selectedItems.length === 0 ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap items below to start building your outfit.
                </p>
              ) : (
                selectedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="flex items-center gap-2 group/row text-left transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/30"
                      style={{ backgroundColor: item.color_hex }}
                    />
                    <span className="text-xs flex-1 truncate">{item.name}</span>
                    <span className="opacity-0 group-hover/row:opacity-100 text-[10px] shrink-0 transition-opacity mr-0.5">
                      ×
                    </span>
                  </button>
                ))
              )}
              {selectedItems.length === 1 && (
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Add one more piece for a score.
                </p>
              )}
            </div>
          </div>

          {/* Tip */}
          {hasOutfit && outfit && (
            <div className="flex items-start gap-2 bg-background/60 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{outfit.tip}</p>
            </div>
          )}
          {selectedItems.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Wardrobe picker ── */}
      {CATEGORY_ORDER.map(cat => {
        const catItems = byCategory[cat]
        if (catItems.length === 0) return null
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-muted-foreground">{CATEGORY_ICONS[cat]}</span>
              <h3 className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</h3>
              <span className="text-xs text-muted-foreground">({catItems.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catItems.map(item => {
                const selected = selectedIds.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 bg-card hover:bg-secondary/30'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg shrink-0 border border-border/40"
                      style={{ backgroundColor: item.color_hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.color_name}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <Button variant="outline" size="sm" className="w-full" onClick={onAddItem}>
        <Plus className="w-4 h-4 mr-1" /> Add more items to your wardrobe
      </Button>
    </div>
  )
}
