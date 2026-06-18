'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Check } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, ColorAnalysis } from '@/lib/types'
import { addLocalWardrobeItem } from '@/lib/outfitEngine'
import { SEASON_COLOURS, NEUTRAL_COLOURS } from '@/lib/palettes'

const CATEGORIES: { value: ItemCategory; label: string; example: string }[] = [
  { value: 'top',       label: 'Top',       example: 'T-shirt, shirt, jumper' },
  { value: 'bottom',    label: 'Bottom',    example: 'Trousers, jeans, shorts' },
  { value: 'jacket',    label: 'Jacket',    example: 'Blazer, coat, hoodie' },
  { value: 'shoes',     label: 'Shoes',     example: 'Trainers, boots, loafers' },
  { value: 'accessory', label: 'Accessory', example: 'Belt, scarf, bag' },
]

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
