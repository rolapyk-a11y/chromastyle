'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Check, ImagePlus } from 'lucide-react'
import type { UserWardrobeItem, ItemCategory, ColorAnalysis, FabricWeight, GarmentCut } from '@/lib/types'
import { addLocalWardrobeItem } from '@/lib/outfitEngine'
import { SEASON_COLOURS, NEUTRAL_COLOURS } from '@/lib/palettes'

const CUTS: { value: GarmentCut; label: string }[] = [
  { value: 'slim',     label: 'Slim' },
  { value: 'tapered',  label: 'Tapered' },
  { value: 'regular',  label: 'Regular' },
  { value: 'relaxed',  label: 'Relaxed' },
  { value: 'wide',     label: 'Wide' },
  { value: 'oversized',label: 'Oversized' },
]

const CATEGORIES: { value: ItemCategory; label: string; example: string }[] = [
  { value: 'top',       label: 'Top',       example: 'T-shirt, shirt, jumper' },
  { value: 'bottom',    label: 'Bottom',    example: 'Trousers, jeans, shorts' },
  { value: 'jacket',    label: 'Jacket',    example: 'Blazer, coat, hoodie' },
  { value: 'shoes',     label: 'Shoes',     example: 'Trainers, boots, loafers' },
  { value: 'accessory', label: 'Accessory', example: 'Belt, scarf, bag' },
]

const FABRICS: { value: FabricWeight; label: string; example: string }[] = [
  { value: 'linen',        label: 'Linen',         example: 'Shirt, trousers, shorts' },
  { value: 'light-cotton', label: 'Light cotton',  example: 'T-shirt, polo' },
  { value: 'cotton',       label: 'Cotton',        example: 'Chinos, Oxford shirt' },
  { value: 'denim',        label: 'Denim',         example: 'Jeans, denim shorts' },
  { value: 'knit',         label: 'Knit',          example: 'Sweater, jumper, hoodie' },
  { value: 'fleece',       label: 'Fleece',        example: 'Fleece jacket, tracksuit' },
  { value: 'wool',         label: 'Wool',          example: 'Wool coat, heavy knit' },
]

// Downscale + re-encode an uploaded photo so it stays small in localStorage.
function downscaleImage(file: File, max = 640, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height, 1))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(reader.result as string); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface AddItemSheetProps {
  open: boolean
  onClose: () => void
  colorAnalysis: ColorAnalysis | undefined
  onAdded: () => void
}

export function AddItemSheet({ open, onClose, colorAnalysis, onAdded }: AddItemSheetProps) {
  const [category, setCategory] = useState<ItemCategory>('top')
  const [fabric, setFabric] = useState<FabricWeight | undefined>(undefined)
  const [cut, setCut] = useState<GarmentCut | undefined>(undefined)
  const [name, setName] = useState('')
  const [selectedColour, setSelectedColour] = useState<{ hex: string; name: string } | null>(null)
  const [customHex, setCustomHex] = useState('#888888')
  const [image, setImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setImage(await downscaleImage(file))
    } catch {
      /* ignore unreadable image */
    }
  }

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
      ...(fabric ? { fabric } : {}),
      ...(cut ? { cut } : {}),
      ...(image ? { image_url: image } : {}),
      created_at: new Date().toISOString(),
    }
    addLocalWardrobeItem(item)
    onAdded()
    // Reset form
    setName('')
    setFabric(undefined)
    setCut(undefined)
    setSelectedColour(null)
    setImage(null)
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

          {/* Photo (optional — enables try-on) */}
          <div>
            <p className="text-sm font-medium mb-2">
              Photo <span className="text-muted-foreground font-normal">(optional — see it on the try-on figure)</span>
            </p>
            <div className="flex items-center gap-3">
              {image ? (
                <div className="relative">
                  <img src={image} alt="Item" className="w-16 h-16 rounded-xl object-cover border border-border/40" />
                  <button
                    onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px]">Add</span>
                </button>
              )}
              <p className="text-xs text-muted-foreground flex-1">
                A photo of the garment on a plain background works best — the try-on figure removes the background automatically.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="hidden"
            />
          </div>

          {/* Fabric */}
          <div>
            <p className="text-sm font-medium mb-2">
              Fabric <span className="text-muted-foreground font-normal">(optional — improves outfit scoring)</span>
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {FABRICS.map(fab => (
                <button
                  key={fab.value}
                  onClick={() => setFabric(f => f === fab.value ? undefined : fab.value)}
                  className={`flex flex-col items-start rounded-xl border p-2 text-xs transition-colors text-left ${
                    fabric === fab.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <span className="font-medium leading-tight">{fab.label}</span>
                  <span className="leading-tight opacity-70 mt-0.5 text-[10px]">{fab.example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cut / fit */}
          <div>
            <p className="text-sm font-medium mb-2">
              Cut <span className="text-muted-foreground font-normal">(optional — matched to your fit profile)</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {CUTS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCut(prev => prev === c.value ? undefined : c.value)}
                  className={`rounded-xl border p-2 text-xs transition-colors ${
                    cut === c.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
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
