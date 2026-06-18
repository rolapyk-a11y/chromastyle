'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Shirt, ShoppingBag, Footprints, Layers, Star } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, ColorAnalysis, OutfitCombo } from '@/lib/types'
import {
  loadLocalWardrobe,
  saveLocalWardrobe,
  generateOutfits,
} from '@/lib/outfitEngine'
import { AddItemSheet } from './add-item-sheet'
import { OutfitSuggestions } from './outfit-suggestions'

const CATEGORY_ICONS: Record<ItemCategory, React.ReactNode> = {
  top:       <Shirt className="w-4 h-4" />,
  bottom:    <ShoppingBag className="w-4 h-4" />,
  shoes:     <Footprints className="w-4 h-4" />,
  jacket:    <Layers className="w-4 h-4" />,
  accessory: <Star className="w-4 h-4" />,
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  top: 'Tops', bottom: 'Bottoms', shoes: 'Shoes', jacket: 'Jackets', accessory: 'Accessories',
}

const CATEGORY_ORDER: ItemCategory[] = ['top', 'bottom', 'jacket', 'shoes', 'accessory']

interface MyWardrobeProps {
  colorAnalysis: ColorAnalysis | undefined
}

type ActiveView = 'wardrobe' | 'outfits'

export function MyWardrobe({ colorAnalysis }: MyWardrobeProps) {
  const [items, setItems] = useState<UserWardrobeItem[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('wardrobe')
  const [outfits, setOutfits] = useState<OutfitCombo[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setItems(loadLocalWardrobe())
  }, [])

  const refresh = useCallback(() => {
    const loaded = loadLocalWardrobe()
    setItems(loaded)
    if (colorAnalysis?.sub_season) {
      setOutfits(generateOutfits(loaded, colorAnalysis.sub_season))
    }
  }, [colorAnalysis?.sub_season])

  // Regenerate outfits whenever items or analysis changes
  useEffect(() => {
    if (colorAnalysis?.sub_season) {
      setOutfits(generateOutfits(items, colorAnalysis.sub_season))
    }
  }, [items, colorAnalysis?.sub_season])

  function removeItem(id: string) {
    const updated = items.filter(i => i.id !== id)
    saveLocalWardrobe(updated)
    setItems(updated)
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<ItemCategory, UserWardrobeItem[]>>(
    (acc, cat) => ({ ...acc, [cat]: items.filter(i => i.category === cat) }),
    {} as Record<ItemCategory, UserWardrobeItem[]>
  )

  const hasEnoughForOutfits = items.some(i => i.category === 'top') && items.some(i => i.category === 'bottom')

  return (
    <div className="space-y-4">

      {/* ── Tab bar ── */}
      <div className="flex gap-2 border-b border-border pb-0">
        {(['wardrobe', 'outfits'] as const).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeView === view
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {view === 'outfits' ? `Outfits${outfits.length > 0 ? ` (${outfits.length})` : ''}` : 'My Items'}
          </button>
        ))}
      </div>

      {/* ── My Items view ── */}
      {activeView === 'wardrobe' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? 'Add items you own — tops, trousers, shoes, jackets.'
                : `${items.length} item${items.length !== 1 ? 's' : ''} in your wardrobe`}
            </p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add item
            </Button>
          </div>

          {items.length === 0 && (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                <Shirt className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-sm">Your wardrobe is empty</p>
                <p className="text-xs">Add at least one top and one bottom to generate outfit suggestions.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add first item
                </Button>
              </CardContent>
            </Card>
          )}

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
                  {catItems.map(item => (
                    <WardrobeItemCard key={item.id} item={item} onRemove={removeItem} />
                  ))}
                </div>
              </div>
            )
          })}

          {items.length > 0 && !hasEnoughForOutfits && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Add at least one top and one bottom to unlock outfit suggestions.
            </p>
          )}

          {hasEnoughForOutfits && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setActiveView('outfits')}
            >
              See outfit suggestions →
            </Button>
          )}
        </div>
      )}

      {/* ── Outfits view ── */}
      {activeView === 'outfits' && (
        <OutfitSuggestions
          outfits={outfits}
          subSeason={colorAnalysis?.sub_season}
          onAddItem={() => { setAddOpen(true); setActiveView('wardrobe') }}
          hasItems={items.length > 0}
        />
      )}

      <AddItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        colorAnalysis={colorAnalysis}
        onAdded={refresh}
      />
    </div>
  )
}

// ─── Single item card ─────────────────────────────────────────────────────────

function WardrobeItemCard({
  item,
  onRemove,
}: {
  item: UserWardrobeItem
  onRemove: (id: string) => void
}) {
  return (
    <div className="relative group rounded-xl border border-border/50 p-3 flex items-center gap-3 bg-card hover:bg-secondary/30 transition-colors">
      {/* Colour swatch */}
      <div
        className="w-10 h-10 rounded-lg shrink-0 border border-border/40"
        style={{ backgroundColor: item.color_hex }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.color_name}</p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
        aria-label="Remove item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
