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

const CATEGORY_SINGULAR: Record<ItemCategory, string> = {
  top: 'Top', bottom: 'Bottom', jacket: 'Jacket', shoes: 'Shoes', accessory: 'Accessory',
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

          {selectedItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              Nothing selected yet — tap items below to add them.
            </p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="flex flex-col items-center gap-1 group/swatch"
                  title={`Remove ${item.name}`}
                >
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-xl border border-border/40 shadow-sm"
                      style={{ backgroundColor: item.color_hex }}
                    />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground opacity-0 group-hover/swatch:opacity-100 transition-opacity text-[10px]">
                      ×
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{CATEGORY_SINGULAR[item.category]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tip */}
          {hasOutfit && outfit && (
            <div className="flex items-start gap-2 bg-background/60 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{outfit.tip}</p>
            </div>
          )}
          {selectedItems.length === 1 && (
            <p className="text-xs text-muted-foreground">
              Add one more piece to see a compatibility score.
            </p>
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
