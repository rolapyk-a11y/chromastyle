'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Check } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, ColorAnalysis } from '@/lib/types'
import { addLocalWardrobeItem } from '@/lib/outfitEngine'

const CATEGORIES: { value: ItemCategory; label: string; example: string }[] = [
  { value: 'top',       label: 'Top',       example: 'T-shirt, shirt, jumper' },
  { value: 'bottom',    label: 'Bottom',    example: 'Trousers, jeans, shorts' },
  { value: 'jacket',    label: 'Jacket',    example: 'Blazer, coat, hoodie' },
  { value: 'shoes',     label: 'Shoes',     example: 'Trainers, boots, loafers' },
  { value: 'accessory', label: 'Accessory', example: 'Belt, scarf, bag' },
]

// Neutral colours shown for all seasons
const NEUTRAL_COLOURS = [
  { hex: '#F5F5F0', name: 'Off-White' },
  { hex: '#F2E4D0', name: 'Ivory Cream' },
  { hex: '#D2B48C', name: 'Tan' },
  { hex: '#C4A070', name: 'Camel' },
  { hex: '#8B7355', name: 'Warm Taupe' },
  { hex: '#808080', name: 'Mid Grey' },
  { hex: '#36454F', name: 'Charcoal' },
  { hex: '#003366', name: 'Deep Navy' },
  { hex: '#1A1A1A', name: 'Near Black' },
  { hex: '#FFFFFF', name: 'White' },
]

// Season-specific palette preview colours
const SEASON_COLOURS: Record<string, Array<{ hex: string; name: string }>> = {
  'light-spring':  [
    { hex: '#F5A886', name: 'Apricot' }, { hex: '#F4C4A4', name: 'Peach' },
    { hex: '#F8E080', name: 'Banana Yellow' }, { hex: '#94D4B0', name: 'Warm Mint' },
    { hex: '#A8C4DC', name: 'Powder Blue' }, { hex: '#F0B4C4', name: 'Taffy Pink' },
    { hex: '#B4D890', name: 'Pistachio' }, { hex: '#E8C058', name: 'Honey' },
  ],
  'true-spring':   [
    { hex: '#F4892C', name: 'Coral Orange' }, { hex: '#F5B030', name: 'Golden Yellow' },
    { hex: '#48C898', name: 'Turquoise' }, { hex: '#70C870', name: 'Clear Green' },
    { hex: '#F9D840', name: 'Daisy Yellow' }, { hex: '#F09060', name: 'Warm Orange' },
  ],
  'warm-spring':   [
    { hex: '#E8782A', name: 'Rich Coral' }, { hex: '#E8C430', name: 'Rich Yellow' },
    { hex: '#60B878', name: 'Warm Olive' }, { hex: '#D4942A', name: 'Warm Amber' },
    { hex: '#C87840', name: 'Caramel Brown' }, { hex: '#A0C050', name: 'Yellow-Green' },
  ],
  'light-summer':  [
    { hex: '#A4C1F3', name: 'Powder Blue' }, { hex: '#BDA7DD', name: 'Pale Lavender' },
    { hex: '#D4B8C8', name: 'Soft Rose' }, { hex: '#A8CCC8', name: 'Cool Mint' },
    { hex: '#C8D0E4', name: 'Periwinkle' }, { hex: '#D8D0EC', name: 'Icy Lilac' },
  ],
  'true-summer':   [
    { hex: '#CED6E0', name: 'Foggy Sky' }, { hex: '#A6B8D2', name: 'Bluebell Haze' },
    { hex: '#6F96A2', name: 'Ocean Slate' }, { hex: '#BDAECF', name: 'Lavender Dust' },
    { hex: '#E4C4CA', name: 'Hushed Blush' }, { hex: '#C4A8B8', name: 'Cool Mauve' },
  ],
  'soft-summer':   [
    { hex: '#7598C4', name: 'Dusty Blue' }, { hex: '#998CBD', name: 'Muted Lavender' },
    { hex: '#C4A0A8', name: 'Dusty Rose' }, { hex: '#A0B4A4', name: 'Sage Grey' },
    { hex: '#98AEB4', name: 'Eucalyptus' }, { hex: '#78ABC6', name: 'Soft Blue' },
  ],
  'soft-autumn':   [
    { hex: '#9CAF88', name: 'Soft Olive' }, { hex: '#D9927A', name: 'Muted Terracotta' },
    { hex: '#D99058', name: 'Faded Terracotta' }, { hex: '#BDBFA0', name: 'Light Sage' },
    { hex: '#D1B7A3', name: 'Soft Camel' }, { hex: '#C48793', name: 'Dusty Rose' },
  ],
  'true-autumn':   [
    { hex: '#CC5500', name: 'Burnt Orange' }, { hex: '#DAA520', name: 'Goldenrod' },
    { hex: '#708238', name: 'Olive Green' }, { hex: '#800020', name: 'Burgundy' },
    { hex: '#B7410E', name: 'Rust' }, { hex: '#556B2F', name: 'Dark Olive' },
  ],
  'dark-autumn':   [
    { hex: '#924819', name: 'Burnt Sienna' }, { hex: '#404C24', name: 'Army Green' },
    { hex: '#800000', name: 'Wine' }, { hex: '#8A3324', name: 'Paprika' },
    { hex: '#5C4033', name: 'Rich Brown' }, { hex: '#675100', name: 'Muddy Olive' },
  ],
  'dark-winter':   [
    { hex: '#003153', name: 'Prussian Blue' }, { hex: '#015871', name: 'Deep Teal' },
    { hex: '#7D1B4D', name: 'Rich Plum' }, { hex: '#00491E', name: 'Deep Emerald' },
    { hex: '#5F2566', name: 'Dark Purple' }, { hex: '#64242E', name: 'Deep Burgundy' },
  ],
  'true-winter':   [
    { hex: '#000000', name: 'Black' }, { hex: '#003087', name: 'Cobalt Blue' },
    { hex: '#CC0000', name: 'True Red' }, { hex: '#800080', name: 'Purple' },
    { hex: '#9B111E', name: 'Ruby Red' }, { hex: '#4B0082', name: 'Indigo' },
  ],
  'clear-winter':  [
    { hex: '#DA4A94', name: 'Vivid Magenta' }, { hex: '#0000CD', name: 'Electric Blue' },
    { hex: '#9400D3', name: 'Vivid Violet' }, { hex: '#00CED1', name: 'Clear Turquoise' },
    { hex: '#BE74C9', name: 'Rich Orchid' }, { hex: '#FF1493', name: 'Deep Pink' },
  ],
}

interface AddItemSheetProps {
  open: boolean
  onClose: () => void
  colorAnalysis: ColorAnalysis | undefined
  onAdded: () => void
}

export function AddItemSheet({ open, onClose, colorAnalysis, onAdded }: AddItemSheetProps) {
  const [category, setCategory] = useState<ItemCategory>('top')
  const [name, setName] = useState('')
  const [selectedColour, setSelectedColour] = useState<{ hex: string; name: string } | null>(null)
  const [customHex, setCustomHex] = useState('#888888')

  const subSeason = colorAnalysis?.sub_season
  const paletteColours = subSeason ? (SEASON_COLOURS[subSeason] ?? []) : []

  function handleSave() {
    const colour = selectedColour ?? { hex: customHex, name: 'Custom' }
    const item: UserWardrobeItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim() || `${colour.name} ${category}`,
      category,
      color_hex: colour.hex,
      color_name: colour.name,
      created_at: new Date().toISOString(),
    }
    addLocalWardrobeItem(item)
    onAdded()
    // Reset form
    setName('')
    setSelectedColour(null)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Add item to wardrobe</h2>
            <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category */}
          <div>
            <p className="text-sm font-medium mb-2">Category</p>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition-colors ${
                    category === cat.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <span className="font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              e.g. {CATEGORIES.find(c => c.value === category)?.example}
            </p>
          </div>

          {/* Colour — season palette */}
          {paletteColours.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Your season colours</p>
              <div className="grid grid-cols-4 gap-2">
                {paletteColours.map(col => (
                  <button
                    key={col.hex}
                    onClick={() => setSelectedColour(col)}
                    className={`flex items-center gap-2 rounded-lg border p-2 transition-all ${
                      selectedColour?.hex === col.hex
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md shrink-0 border border-border/30"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-xs truncate">{col.name}</span>
                    {selectedColour?.hex === col.hex && (
                      <Check className="w-3 h-3 text-primary shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Neutral colours */}
          <div>
            <p className="text-sm font-medium mb-2">Neutrals</p>
            <div className="grid grid-cols-5 gap-2">
              {NEUTRAL_COLOURS.map(col => (
                <button
                  key={col.hex}
                  onClick={() => setSelectedColour(col)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${
                    selectedColour?.hex === col.hex
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-md border border-border/30"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span className="text-xs text-center leading-tight">{col.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom colour */}
          <div>
            <p className="text-sm font-medium mb-2">Or pick a custom colour</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customHex}
                onChange={e => { setCustomHex(e.target.value); setSelectedColour(null) }}
                className="w-12 h-10 rounded cursor-pointer border border-border"
              />
              <span className="text-sm text-muted-foreground">{customHex}</span>
              {!selectedColour && (
                <span className="text-xs text-primary">← using this colour</span>
              )}
            </div>
          </div>

          {/* Name (optional) */}
          <div>
            <p className="text-sm font-medium mb-2">Name <span className="text-muted-foreground font-normal">(optional)</span></p>
            <Input
              placeholder={`e.g. Camel linen ${category}`}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Preview + Save */}
          <div className="flex items-center gap-4">
            {(selectedColour ?? customHex) && (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-border/40"
                  style={{ backgroundColor: selectedColour?.hex ?? customHex }}
                />
                <div>
                  <p className="text-xs font-medium">{selectedColour?.name ?? 'Custom'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{category}</p>
                </div>
              </div>
            )}
            <Button className="flex-1" onClick={handleSave}>
              Add to wardrobe
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}
