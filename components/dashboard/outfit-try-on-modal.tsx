'use client'

import { useCallback, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ClothingItem, OutfitCombo, UserWardrobeItem } from '@/lib/types'
import { detectTryOnPlacement, type TryOnPlacement } from '@/lib/tryon/posePlacement'
import { Camera, Download, Loader2, RotateCcw, SlidersHorizontal, Upload } from 'lucide-react'

type Step = 'capture' | 'preview' | 'error'

interface OutfitTryOnModalProps {
  outfit: OutfitCombo | null
  isOpen: boolean
  onClose: () => void
}

interface OutfitLayer {
  item: UserWardrobeItem
  x: number
  y: number
  scale: number
  stretchX: number
  stretchY: number
  rotation: number
  opacity: number
}

function proxiedImageUrl(url: string) {
  if (url.startsWith('data:') || url.startsWith('/')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function wardrobeItemToClothingItem(item: UserWardrobeItem): ClothingItem {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand || 'My Wardrobe',
    category: item.category === 'bottom' ? 'pants' : item.category === 'jacket' ? 'outerwear' : item.category,
    subcategory: null,
    price: 0,
    currency: 'GBP',
    image_url: item.image_url || '',
    product_url: null,
    colors: [item.color_hex],
    seasons: [],
    style_tags: [],
    is_trending: false,
    created_at: item.created_at,
    updated_at: item.created_at,
  }
}

function categoryPreset(item: UserWardrobeItem): Omit<OutfitLayer, 'item'> {
  if (item.category === 'bottom') {
    return { x: 50, y: 67, scale: 48, stretchX: 92, stretchY: 116, rotation: 0, opacity: 92 }
  }
  if (item.category === 'jacket') {
    return { x: 50, y: 45, scale: 58, stretchX: 110, stretchY: 112, rotation: 0, opacity: 86 }
  }
  if (item.category === 'shoes') {
    return { x: 50, y: 91, scale: 32, stretchX: 120, stretchY: 70, rotation: 0, opacity: 92 }
  }
  return { x: 50, y: 43, scale: 48, stretchX: 100, stretchY: 98, rotation: 0, opacity: 92 }
}

function layerSortValue(item: UserWardrobeItem) {
  if (item.category === 'bottom') return 1
  if (item.category === 'top') return 2
  if (item.category === 'jacket') return 3
  if (item.category === 'shoes') return 4
  return 5
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function applyPlacement(layer: OutfitLayer, placement: TryOnPlacement): OutfitLayer {
  return {
    ...layer,
    x: Math.round(placement.x),
    y: Math.round(placement.y),
    scale: Math.round(placement.scale),
    stretchX: Math.round(placement.stretchX),
    stretchY: Math.round(placement.stretchY),
    rotation: Math.round(placement.rotation),
  }
}

export function OutfitTryOnModal({ outfit, isOpen, onClose }: OutfitTryOnModalProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('capture')
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [layers, setLayers] = useState<OutfitLayer[]>([])
  const [hasCamera, setHasCamera] = useState(true)
  const [isAutoPlacing, setIsAutoPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('capture')
    setModelImage(null)
    setLayers([])
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) setModelImage(imageSrc)
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setModelImage(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const startPreview = useCallback(async () => {
    if (!outfit || !modelImage) return

    const nextLayers = outfit.items
      .filter(item => item.category !== 'accessory')
      .sort((a, b) => layerSortValue(a) - layerSortValue(b))
      .map(item => ({ item, ...categoryPreset(item) }))

    setLayers(nextLayers)
    setStep('preview')
    setIsAutoPlacing(true)

    try {
      const placedLayers = await Promise.all(nextLayers.map(async layer => {
        if (layer.item.category === 'shoes') return layer
        const placement = await detectTryOnPlacement(modelImage, wardrobeItemToClothingItem(layer.item))
        return placement ? applyPlacement(layer, placement) : layer
      }))
      setLayers(placedLayers)
    } catch {
      setError('Auto-fit was unavailable, so I used the outfit presets.')
    } finally {
      setIsAutoPlacing(false)
    }
  }, [modelImage, outfit])

  const downloadPreview = useCallback(async () => {
    if (!modelImage || !outfit) return

    try {
      const model = await loadImage(modelImage)
      const canvas = document.createElement('canvas')
      canvas.width = 900
      canvas.height = 1200
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is not available')

      const modelAspect = model.width / model.height
      const canvasAspect = canvas.width / canvas.height
      let drawWidth = canvas.width
      let drawHeight = canvas.height
      let drawX = 0
      let drawY = 0

      if (modelAspect > canvasAspect) {
        drawHeight = canvas.height
        drawWidth = drawHeight * modelAspect
        drawX = (canvas.width - drawWidth) / 2
      } else {
        drawWidth = canvas.width
        drawHeight = drawWidth / modelAspect
        drawY = (canvas.height - drawHeight) / 2
      }

      ctx.drawImage(model, drawX, drawY, drawWidth, drawHeight)

      for (const layer of layers) {
        const baseWidth = canvas.width * (layer.scale / 100)
        const width = baseWidth * (layer.stretchX / 100)
        const x = canvas.width * (layer.x / 100)
        const y = canvas.height * (layer.y / 100)

        ctx.save()
        ctx.globalAlpha = layer.opacity / 100
        ctx.globalCompositeOperation = 'multiply'
        ctx.translate(x, y)
        ctx.rotate((layer.rotation * Math.PI) / 180)

        if (layer.item.image_url) {
          const garment = await loadImage(proxiedImageUrl(layer.item.image_url))
          const height = baseWidth * (garment.height / garment.width) * (layer.stretchY / 100)
          ctx.drawImage(garment, -width / 2, -height / 2, width, height)
        } else {
          const height = baseWidth * 1.18 * (layer.stretchY / 100)
          ctx.fillStyle = layer.item.color_hex
          ctx.fillRect(-width / 2, -height / 2, width, height)
        }
        ctx.restore()
      }

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/jpeg', 0.92)
      link.download = `outfit-preview-${outfit.scoreLabel.toLowerCase()}-${outfit.score}.jpg`
      link.click()
    } catch {
      setError('Could not save this outfit preview.')
    }
  }, [layers, modelImage, outfit])

  if (!outfit) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Outfit Preview</DialogTitle>
          <DialogDescription>
            Preview this {outfit.scoreLabel.toLowerCase()} outfit on your photo
          </DialogDescription>
        </DialogHeader>

        {step === 'capture' && (
          <div className="space-y-4">
            <div className="relative aspect-[3/4] max-h-[420px] bg-secondary rounded-lg overflow-hidden">
              {modelImage ? (
                <img src={modelImage} alt="Your photo" className="w-full h-full object-cover" />
              ) : hasCamera ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ width: 480, height: 640, facingMode: 'user' }}
                  onUserMediaError={() => setHasCamera(false)}
                  className="w-full h-full object-cover"
                  mirrored
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Camera not available. Upload a photo instead.</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              {modelImage ? (
                <>
                  <Button variant="outline" onClick={() => setModelImage(null)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retake
                  </Button>
                  <Button onClick={startPreview}>Preview Outfit</Button>
                </>
              ) : (
                <>
                  {hasCamera && (
                    <Button onClick={capturePhoto}>
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                  )}
                  <Button variant={hasCamera ? 'outline' : 'default'} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
        )}

        {step === 'preview' && modelImage && (
          <div className="space-y-4">
            <div className="relative aspect-[3/4] max-h-[560px] bg-secondary rounded-lg overflow-hidden mx-auto">
              <img src={modelImage} alt="Your photo" className="absolute inset-0 w-full h-full object-cover" />
              {layers.map(layer => (
                layer.item.image_url ? (
                  <img
                    key={layer.item.id}
                    src={proxiedImageUrl(layer.item.image_url)}
                    alt={layer.item.name}
                    className="absolute object-contain drop-shadow-xl"
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${layer.scale}%`,
                      opacity: layer.opacity / 100,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scaleX(${layer.stretchX / 100}) scaleY(${layer.stretchY / 100})`,
                      mixBlendMode: 'multiply',
                    }}
                  />
                ) : (
                  <div
                    key={layer.item.id}
                    className="absolute rounded-md border border-black/10 shadow-xl"
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${layer.scale * (layer.stretchX / 100)}%`,
                      height: `${layer.scale * 1.18 * (layer.stretchY / 100)}%`,
                      opacity: layer.opacity / 100,
                      backgroundColor: layer.item.color_hex,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                      mixBlendMode: 'multiply',
                    }}
                  />
                )
              ))}
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 text-foreground text-xs font-medium">
                  {isAutoPlacing ? <Loader2 className="w-3 h-3 animate-spin" /> : <SlidersHorizontal className="w-3 h-3" />}
                  {isAutoPlacing ? 'Auto-fitting outfit' : `${outfit.scoreLabel} outfit`}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              {layers.map(layer => (
                <div key={layer.item.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-sm border border-border/50" style={{ backgroundColor: layer.item.color_hex }} />
                    <span className="truncate">{layer.item.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{layer.item.category}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setStep('capture')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Change Photo
              </Button>
              <Button variant="outline" onClick={downloadPreview}>
                <Download className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
