'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Shirt, ShoppingBag, Footprints, Layers, Star, Sparkles, Ruler, X } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, ColorAnalysis, OutfitCombo, BodyProfile } from '@/lib/types'
import {
  loadLocalWardrobe,
  saveLocalWardrobe,
  generateOutfits,
} from '@/lib/outfitEngine'
import { loadBodyProfile, saveBodyProfile, fitTipsFor, bodyProfileSummary } from '@/lib/bodyGuide'
import { AddItemSheet } from './add-item-sheet'
import { BodyProfileQuiz } from './body-profile-quiz'
import { OutfitSuggestions } from './outfit-suggestions'
import { ColourMatches } from './colour-matches'
import { StyleItemModal } from './style-item-modal'
import { shopLinksFor } from '@/lib/shopLinks'
import type { CatalogProduct } from '@/lib/productCatalog'

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

type ActiveView = 'wardrobe' | 'outfits' | 'shop-colours'

export function MyWardrobe({ colorAnalysis }: MyWardrobeProps) {
  const [items, setItems] = useState<UserWardrobeItem[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('wardrobe')
  const [outfits, setOutfits] = useState<OutfitCombo[]>([])
  const [styleAnchor, setStyleAnchor] = useState<UserWardrobeItem | null>(null)
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | undefined>(undefined)
  const [showBodyQuiz, setShowBodyQuiz] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setItems(loadLocalWardrobe())
    setBodyProfile(loadBodyProfile())
  }, [])

  const refresh = useCallback(() => {
    const loaded = loadLocalWardrobe()
    setItems(loaded)
    if (colorAnalysis?.sub_season) {
      setOutfits(generateOutfits(loaded, colorAnalysis.sub_season, bodyProfile))
    }
  }, [colorAnalysis?.sub_season, bodyProfile])

  // Regenerate outfits whenever items, analysis, or body profile changes
  useEffect(() => {
    if (colorAnalysis?.sub_season) {
      setOutfits(generateOutfits(items, colorAnalysis.sub_season, bodyProfile))
    }
  }, [items, colorAnalysis?.sub_season, bodyProfile])

  function removeItem(id: string) {
    const updated = items.filter(i => i.id !== id)
    saveLocalWardrobe(updated)
    setItems(updated)
  }

  // From "what goes with this?", quickly add a suggested season colour you own
  function addSuggestedColour(hex: string, name: string, category: ItemCategory) {
    const item: UserWardrobeItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: `${name} ${category}`,
      category,
      color_hex: hex,
      color_name: name,
      created_at: new Date().toISOString(),
    }
    const updated = [...items, item]
    saveLocalWardrobe(updated)
    setItems(updated)
  }

  // From "Shop My Colours", add a real catalog product to your inventory
  function addCatalogProduct(p: CatalogProduct) {
    const item: UserWardrobeItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: p.name,
      category: p.category,
      color_hex: p.colorHex,
      color_name: p.colorName ?? p.colorHex,
      brand: p.brand,
      image_url: p.image_url,
      created_at: new Date().toISOString(),
    }
    const updated = [...items, item]
    saveLocalWardrobe(updated)
    setItems(updated)
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<ItemCategory, UserWardrobeItem[]>>(
    (acc, cat) => ({ ...acc, [cat]: items.filter(i => i.category === cat) }),
    {} as Record<ItemCategory, UserWardrobeItem[]>
  )

  const hasEnoughForOutfits = items.some(i => i.category === 'top') && items.some(i => i.category === 'bottom')

  // Inline body-profile quiz overlay
  if (showBodyQuiz) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowBodyQuiz(false)}
          className="absolute -top-1 right-0 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <BodyProfileQuiz
          onComplete={(profile) => {
            saveBodyProfile(profile)
            setBodyProfile(profile)
            setShowBodyQuiz(false)
          }}
          onSkip={() => setShowBodyQuiz(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Fit profile banner ── */}
      <FitProfileBanner
        profile={bodyProfile}
        onEdit={() => setShowBodyQuiz(true)}
      />

      {/* ── Tab bar ── */}
      <div className="flex gap-2 border-b border-border pb-0">
        {(['wardrobe', 'outfits', 'shop-colours'] as const).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeView === view
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {view === 'outfits'
              ? `Outfits${outfits.length > 0 ? ` (${outfits.length})` : ''}`
              : view === 'shop-colours'
                ? 'Shop My Colours'
                : 'My Items'}
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
                    <WardrobeItemCard key={item.id} item={item} onRemove={removeItem} onStyle={setStyleAnchor} />
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

      {/* ── Shop My Colours view (real products matched by colour distance) ── */}
      {activeView === 'shop-colours' && (
        <ColourMatches colorAnalysis={colorAnalysis} bodyProfile={bodyProfile} onAddToInventory={addCatalogProduct} />
      )}

      <AddItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        colorAnalysis={colorAnalysis}
        onAdded={refresh}
      />

      {styleAnchor && (
        <StyleItemModal
          anchor={styleAnchor}
          items={items}
          subSeason={colorAnalysis?.sub_season}
          onClose={() => setStyleAnchor(null)}
          onAddColour={addSuggestedColour}
        />
      )}
    </div>
  )
}

// ─── Fit profile banner ───────────────────────────────────────────────────────

function FitProfileBanner({
  profile,
  onEdit,
}: {
  profile: BodyProfile | undefined
  onEdit: () => void
}) {
  const [showTips, setShowTips] = useState(false)

  // No profile yet → prompt to set one
  if (!profile) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Ruler className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Add your fit profile</p>
            <p className="text-xs text-muted-foreground">
              4 quick questions so we recommend cuts that flatter your shape, not just your colours.
            </p>
          </div>
          <Button size="sm" onClick={onEdit}>Set it up</Button>
        </CardContent>
      </Card>
    )
  }

  const tips = fitTipsFor(profile)
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Ruler className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize">{bodyProfileSummary(profile)}</p>
            <button
              onClick={() => setShowTips(s => !s)}
              className="text-xs text-primary hover:underline"
            >
              {showTips ? 'Hide fit rules' : `Show my ${tips.length} fit rules`}
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={onEdit}>Update</Button>
        </div>
        {showTips && (
          <ul className="space-y-1.5 pt-1 border-t border-border/40">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Single item card ─────────────────────────────────────────────────────────

function WardrobeItemCard({
  item,
  onRemove,
  onStyle,
}: {
  item: UserWardrobeItem
  onRemove: (id: string) => void
  onStyle: (item: UserWardrobeItem) => void
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
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onStyle(item)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Sparkles className="w-3 h-3" /> What goes with this?
          </button>
          <a
            href={shopLinksFor(item.color_hex, item.category)[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ShoppingBag className="w-3 h-3" /> Shop
          </a>
        </div>
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
