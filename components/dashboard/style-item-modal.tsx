'use client'

/**
 * Style this item — "what goes with this?"
 *
 * Pick one item you own; the app builds a season-correct outfit around it.
 * Shows the best partners already in your wardrobe, plus palette colours to add
 * for any missing piece — all drawn from your season so nothing clashes with
 * your colouring.
 */

import { useMemo } from 'react'
import { X, Shirt, ShoppingBag, Footprints, Layers, Star, Check, Plus } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, SubSeason } from '@/lib/types'
import { styleAnchorItem } from '@/lib/outfitEngine'
import { shopLinksFor } from '@/lib/shopLinks'

const CATEGORY_ICONS: Record<ItemCategory, React.ReactNode> = {
  top:       <Shirt className="w-4 h-4" />,
  bottom:    <ShoppingBag className="w-4 h-4" />,
  shoes:     <Footprints className="w-4 h-4" />,
  jacket:    <Layers className="w-4 h-4" />,
  accessory: <Star className="w-4 h-4" />,
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  top: 'top', bottom: 'bottom', shoes: 'shoes', jacket: 'jacket', accessory: 'accessory',
}

interface StyleItemModalProps {
  anchor: UserWardrobeItem
  items: UserWardrobeItem[]
  subSeason: SubSeason | undefined
  onClose: () => void
  onAddColour: (hex: string, name: string, category: ItemCategory) => void
}

export function StyleItemModal({ anchor, items, subSeason, onClose, onAddColour }: StyleItemModalProps) {
  const result = useMemo(
    () => (subSeason ? styleAnchorItem(anchor, items, subSeason) : null),
    [anchor, items, subSeason],
  )

  const categories = result
    ? (Object.keys(result.suggestions) as ItemCategory[])
    : []

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-border/40" style={{ backgroundColor: anchor.color_hex }} />
              <div>
                <h2 className="font-semibold text-base">What goes with this?</h2>
                <p className="text-xs text-muted-foreground">{anchor.name} · {anchor.color_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!subSeason && (
            <p className="text-sm text-muted-foreground">
              Run a colour analysis first so suggestions match your season.
            </p>
          )}

          {result && categories.map(cat => {
            const partners = result.partners[cat] ?? []
            const suggestions = result.suggestions[cat] ?? []
            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{CATEGORY_ICONS[cat]}</span>
                  <h3 className="text-sm font-semibold capitalize">{CATEGORY_LABELS[cat]}</h3>
                </div>

                {/* From your wardrobe */}
                {partners.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">From your wardrobe</p>
                    <div className="flex flex-wrap gap-2">
                      {partners.slice(0, 4).map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2 py-1">
                          <div className="w-4 h-4 rounded-sm border border-border/40" style={{ backgroundColor: p.color_hex }} />
                          <span className="text-xs">{p.name}</span>
                          <Check className="w-3 h-3 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Season colours to add */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {partners.length > 0 ? 'Or add one of these season colours' : 'Add one of these season colours'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {suggestions.map(s => {
                      const shop = shopLinksFor(s.colour.hex, cat)[0]
                      return (
                        <div key={s.colour.hex} className="rounded-lg border border-border/50 p-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md border border-border/40 shrink-0" style={{ backgroundColor: s.colour.hex }} />
                            <span className="text-xs truncate">{s.colour.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onAddColour(s.colour.hex, s.colour.name, cat)}
                              className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-1.5 py-1 rounded border border-border/60 hover:border-primary hover:text-primary transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" /> I own it
                            </button>
                            <a
                              href={shop.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-1.5 py-1 rounded border border-border/60 hover:border-primary hover:text-primary transition-colors"
                            >
                              <ShoppingBag className="w-2.5 h-2.5" /> Shop
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </>
  )
}
