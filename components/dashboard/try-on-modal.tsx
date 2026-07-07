'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Webcam from 'react-webcam'
import { ClothingItem } from '@/lib/types'
import { detectTryOnPlacement } from '@/lib/tryon/posePlacement'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  RotateCw,
  Loader2, 
  Download, 
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
  Sparkles,
  Wand2
} from 'lucide-react'
import { getAccessCode } from '@/lib/tryOn'

interface TryOnModalProps {
  item: ClothingItem | null
  isOpen: boolean
  onClose: () => void
}

type Step = 'capture' | 'preview' | 'processing' | 'result' | 'error'
type BlendMode = 'normal' | 'multiply' | 'darken'

function proxiedImageUrl(url: string) {
  if (url.startsWith('data:') || url.startsWith('/')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function cleanedImageStorageKey(itemId: string) {
  return `outfitter_clean_garment_${itemId}`
}

export function TryOnModal({ item, isOpen, onClose }: TryOnModalProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  
  const [step, setStep] = useState<Step>('capture')
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [overlayX, setOverlayX] = useState(50)
  const [overlayY, setOverlayY] = useState(44)
  const [overlayScale, setOverlayScale] = useState(46)
  const [overlayStretchX, setOverlayStretchX] = useState(100)
  const [overlayStretchY, setOverlayStretchY] = useState(100)
  const [overlayOpacity, setOverlayOpacity] = useState(92)
  const [overlayRotation, setOverlayRotation] = useState(0)
  const [blendMode, setBlendMode] = useState<BlendMode>('multiply')
  const [isAutoPlacing, setIsAutoPlacing] = useState(false)
  const [placementStatus, setPlacementStatus] = useState<string | null>(null)
  const [cleanGarmentImage, setCleanGarmentImage] = useState<string | null>(null)
  const [isCleaningGarment, setIsCleaningGarment] = useState(false)
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('capture')
    setModelImage(null)
    setResultImage(null)
    setError(null)
    setPlacementStatus(null)
    setCleanGarmentImage(null)
    setCleanupStatus(null)
  }, [])

  const applyCategoryPreset = useCallback(() => {
    if (!item) return
    if (item.category === 'pants' || item.category === 'trousers') {
      setOverlayX(50)
      setOverlayY(66)
      setOverlayScale(48)
      setOverlayStretchX(92)
      setOverlayStretchY(112)
      setOverlayRotation(0)
    } else if (item.category === 'outerwear') {
      setOverlayX(50)
      setOverlayY(45)
      setOverlayScale(56)
      setOverlayStretchX(108)
      setOverlayStretchY(108)
      setOverlayRotation(0)
    } else {
      setOverlayX(50)
      setOverlayY(43)
      setOverlayScale(48)
      setOverlayStretchX(100)
      setOverlayStretchY(96)
      setOverlayRotation(0)
    }
    setOverlayOpacity(92)
    setBlendMode('multiply')
  }, [item])

  useEffect(() => {
    applyCategoryPreset()
    const cachedCleanImage = item?.id
      ? window.sessionStorage.getItem(cleanedImageStorageKey(item.id))
      : null
    setCleanGarmentImage(cachedCleanImage)
    setCleanupStatus(null)
  }, [applyCategoryPreset, item?.id])

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const cleanGarmentBackground = useCallback(async () => {
    if (!item?.image_url) return

    setIsCleaningGarment(true)
    setCleanupStatus(null)

    try {
      const garment = await loadImage(proxiedImageUrl(item.image_url))
      const maxSide = 900
      const scale = Math.min(1, maxSide / Math.max(garment.width, garment.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(garment.width * scale))
      canvas.height = Math.max(1, Math.round(garment.height * scale))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas is not available')

      ctx.drawImage(garment, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const { data, width, height } = imageData

      const cornerSize = Math.max(8, Math.round(Math.min(width, height) * 0.06))
      const samples: number[] = []

      const sampleCorner = (startX: number, startY: number) => {
        for (let y = startY; y < Math.min(startY + cornerSize, height); y += 2) {
          for (let x = startX; x < Math.min(startX + cornerSize, width); x += 2) {
            const i = (y * width + x) * 4
            if (data[i + 3] > 220) {
              samples.push(data[i], data[i + 1], data[i + 2])
            }
          }
        }
      }

      sampleCorner(0, 0)
      sampleCorner(width - cornerSize, 0)
      sampleCorner(0, height - cornerSize)
      sampleCorner(width - cornerSize, height - cornerSize)

      if (samples.length < 12) throw new Error('Not enough background samples')

      let bgR = 0
      let bgG = 0
      let bgB = 0
      for (let i = 0; i < samples.length; i += 3) {
        bgR += samples[i]
        bgG += samples[i + 1]
        bgB += samples[i + 2]
      }

      const sampleCount = samples.length / 3
      bgR /= sampleCount
      bgG /= sampleCount
      bgB /= sampleCount

      const bgMax = Math.max(bgR, bgG, bgB)
      const bgMin = Math.min(bgR, bgG, bgB)
      const backgroundLooksPlain = bgMin > 205 && bgMax - bgMin < 55
      let removedPixels = 0

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const originalAlpha = data[i + 3]
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const distanceFromBg = Math.hypot(r - bgR, g - bgG, b - bgB)
        const isNearWhite = min > 235 && max - min < 36
        const isNearPlainBg = backgroundLooksPlain && distanceFromBg < 48

        if (isNearWhite || isNearPlainBg) {
          data[i + 3] = 0
          removedPixels++
        } else if (backgroundLooksPlain && distanceFromBg < 78 && min > 185) {
          const fade = Math.max(0.2, Math.min(1, (distanceFromBg - 48) / 30))
          data[i + 3] = Math.round(originalAlpha * fade)
        }
      }

      if (removedPixels < width * height * 0.04) {
        throw new Error('No plain background detected')
      }

      ctx.putImageData(imageData, 0, 0)

      let minX = width
      let minY = height
      let maxX = 0
      let maxY = 0

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3]
          if (alpha > 20) {
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          }
        }
      }

      if (minX >= maxX || minY >= maxY) {
        throw new Error('Cleanup removed too much of the image')
      }

      const padding = 8
      minX = Math.max(0, minX - padding)
      minY = Math.max(0, minY - padding)
      maxX = Math.min(width - 1, maxX + padding)
      maxY = Math.min(height - 1, maxY + padding)

      const cropWidth = maxX - minX + 1
      const cropHeight = maxY - minY + 1
      const cropped = document.createElement('canvas')
      cropped.width = cropWidth
      cropped.height = cropHeight
      const croppedCtx = cropped.getContext('2d')
      if (!croppedCtx) throw new Error('Canvas is not available')

      croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
      const cleanedImage = cropped.toDataURL('image/png')
      setCleanGarmentImage(cleanedImage)
      window.sessionStorage.setItem(cleanedImageStorageKey(item.id), cleanedImage)
      setCleanupStatus('Cleaned the product background for a better preview.')
    } catch {
      setCleanGarmentImage(null)
      setCleanupStatus('Could not safely clean this product image, so I kept the original.')
    } finally {
      setIsCleaningGarment(false)
    }
  }, [item])

  const downloadFreePreview = useCallback(async () => {
    if (!modelImage || !item) return

    try {
      const [model, garment] = await Promise.all([
        loadImage(modelImage),
        loadImage(cleanGarmentImage ?? proxiedImageUrl(item.image_url)),
      ])
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

      const baseGarmentWidth = canvas.width * (overlayScale / 100)
      const garmentWidth = baseGarmentWidth * (overlayStretchX / 100)
      const garmentHeight = baseGarmentWidth * (garment.height / garment.width) * (overlayStretchY / 100)
      const x = canvas.width * (overlayX / 100)
      const y = canvas.height * (overlayY / 100)

      ctx.save()
      ctx.globalAlpha = overlayOpacity / 100
      ctx.globalCompositeOperation = blendMode === 'normal' ? 'source-over' : blendMode
      ctx.translate(x, y)
      ctx.rotate((overlayRotation * Math.PI) / 180)
      ctx.drawImage(garment, -garmentWidth / 2, -garmentHeight / 2, garmentWidth, garmentHeight)
      ctx.restore()

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/jpeg', 0.92)
      link.download = `free-preview-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`
      link.click()
    } catch {
      setError('Could not save this preview. Some retailer images block browser downloads, but the on-screen preview still works.')
      setStep('error')
    }
  }, [blendMode, cleanGarmentImage, item, modelImage, overlayOpacity, overlayRotation, overlayScale, overlayStretchX, overlayStretchY, overlayX, overlayY])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setModelImage(imageSrc)
    }
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setModelImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const applyAutoPlacement = useCallback(async () => {
    if (!modelImage || !item) return
    setIsAutoPlacing(true)
    setPlacementStatus(null)

    try {
      const placement = await detectTryOnPlacement(modelImage, item)
      if (!placement) {
        applyCategoryPreset()
        setPlacementStatus('Could not detect a full body pose, so I used the default fit preset.')
        return
      }

      setOverlayX(Math.round(placement.x))
      setOverlayY(Math.round(placement.y))
      setOverlayScale(Math.round(placement.scale))
      setOverlayStretchX(Math.round(placement.stretchX))
      setOverlayStretchY(Math.round(placement.stretchY))
      setOverlayRotation(Math.round(placement.rotation))
      setOverlayOpacity(92)
      setBlendMode('multiply')
      setPlacementStatus(
        placement.confidence >= 0.65
          ? 'Auto-placed from your shoulders and hips.'
          : 'Auto-shaped with low confidence. Fine-tune width, length, and position.',
      )
    } catch {
      applyCategoryPreset()
      setPlacementStatus('Pose detection was unavailable, so I used the default fit preset.')
    } finally {
      setIsAutoPlacing(false)
    }
  }, [applyCategoryPreset, item, modelImage])

  const startFreePreview = useCallback(async () => {
    if (!modelImage || !item) return
    setStep('preview')
    void cleanGarmentBackground()
    await applyAutoPlacement()
  }, [applyAutoPlacement, cleanGarmentBackground, modelImage, item])

  const startPaidTryOn = useCallback(async () => {
    if (!window.confirm('This uses paid FASHN API credits. Run one AI try-on for this item?')) return
    if (!modelImage || !item) return

    setStep('processing')
    setError(null)

    try {
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelImage,
          garmentImage: item.image_url,
          clothingItemId: item.id,
          category: item.category === 'pants' || item.category === 'trousers'
            ? 'bottom'
            : item.category === 'outerwear'
              ? 'outerwear'
              : item.category === 'shirts' || item.category === 'tops' || item.category === 'knitwear'
                ? 'top'
                : 'auto',
          accessCode: getAccessCode(),
          paidConfirmed: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsApiKey) {
          setError('Virtual try-on requires a FASHN API key. Please configure the FASHN_API_KEY environment variable.')
        } else if (data.needsOwnerAccess) {
          setError('Paid AI try-on is locked to the app owner to prevent accidental API spending. The free preview is still available.')
        } else if (data.needsPaidConfirmation) {
          setError('Paid AI try-on requires explicit confirmation before using API credits.')
        } else {
          setError(data.error || 'Failed to generate try-on')
        }
        setStep('error')
        return
      }

      setResultImage(data.resultImage)
      setStep('result')
    } catch {
      setError('An error occurred. Please try again.')
      setStep('error')
    }
  }, [modelImage, item])

  const downloadResult = useCallback(() => {
    if (!resultImage) return

    const link = document.createElement('a')
    link.href = resultImage
    link.download = `tryon-${item?.name.toLowerCase().replace(/\s+/g, '-')}.jpg`
    link.click()
  }, [resultImage, item])

  if (!item) return null

  const garmentPreviewSrc = cleanGarmentImage ?? proxiedImageUrl(item.image_url)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Virtual Try-On</DialogTitle>
          <DialogDescription>
            See how {item.name} looks on you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Preview */}
          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="relative w-16 h-20 rounded overflow-hidden bg-background">
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{item.brand}</p>
              <p className="font-medium">{item.name}</p>
            </div>
          </div>

          {/* Step Content */}
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] max-h-[400px] bg-secondary rounded-lg overflow-hidden">
                {modelImage ? (
                  <img
                    src={modelImage}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                ) : hasCamera ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 480,
                      height: 640,
                      facingMode: 'user',
                    }}
                    onUserMediaError={() => setHasCamera(false)}
                    className="w-full h-full object-cover"
                    mirrored
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Camera not available. Upload a photo instead.
                    </p>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </Button>
                  </div>
                )}
              </div>

              {/* Capture Controls */}
              <div className="flex items-center justify-center gap-4">
                {modelImage ? (
                  <>
                    <Button variant="outline" onClick={() => setModelImage(null)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retake
                    </Button>
                    <Button onClick={startFreePreview}>
                      Free Preview
                    </Button>
                    <Button variant="outline" onClick={startPaidTryOn}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Try-On
                    </Button>
                  </>
                ) : (
                  <>
                    {hasCamera && (
                      <Button size="lg" onClick={capturePhoto}>
                        <Camera className="mr-2 h-5 w-5" />
                        Take Photo
                      </Button>
                    )}
                    <Button
                      variant={hasCamera ? 'outline' : 'default'}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <p className="text-xs text-muted-foreground text-center">
                For best results, use a full-body photo in good lighting
              </p>
            </div>
          )}



          {step === 'preview' && modelImage && (
            <div className="space-y-4">
              <div ref={previewRef} className="relative aspect-[3/4] max-h-[520px] bg-secondary rounded-lg overflow-hidden mx-auto">
                <img
                  src={modelImage}
                  alt="Your photo"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <img
                  src={garmentPreviewSrc}
                  alt={item.name}
                  className="absolute object-contain drop-shadow-2xl"
                  style={{
                    left: `${overlayX}%`,
                    top: `${overlayY}%`,
                    width: `${overlayScale}%`,
                    opacity: overlayOpacity / 100,
                    transform: `translate(-50%, -50%) rotate(${overlayRotation}deg) scaleX(${overlayStretchX / 100}) scaleY(${overlayStretchY / 100})`,
                    mixBlendMode: blendMode,
                  }}
                />
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 text-foreground text-xs font-medium">
                    {isAutoPlacing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <SlidersHorizontal className="w-3 h-3" />
                    )}
                    {isAutoPlacing ? 'Auto-fitting' : 'Free preview'}
                  </span>
                </div>
                {isCleaningGarment && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 text-foreground text-xs font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Cleaning image
                    </span>
                  </div>
                )}
              </div>

              {(placementStatus || cleanupStatus) && (
                <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  {[placementStatus, cleanupStatus].filter(Boolean).join(' ')}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border/60 p-4 bg-card/50">
                <label className="space-y-1 text-xs font-medium">
                  Horizontal
                  <input className="w-full" type="range" min="20" max="80" value={overlayX} onChange={(e) => setOverlayX(Number(e.target.value))} />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Vertical
                  <input className="w-full" type="range" min="20" max="85" value={overlayY} onChange={(e) => setOverlayY(Number(e.target.value))} />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Size
                  <input className="w-full" type="range" min="20" max="90" value={overlayScale} onChange={(e) => setOverlayScale(Number(e.target.value))} />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Width fit
                  <input className="w-full" type="range" min="70" max="135" value={overlayStretchX} onChange={(e) => setOverlayStretchX(Number(e.target.value))} />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Length fit
                  <input className="w-full" type="range" min="70" max="145" value={overlayStretchY} onChange={(e) => setOverlayStretchY(Number(e.target.value))} />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Opacity
                  <input className="w-full" type="range" min="35" max="100" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Rotation
                  <input className="w-full" type="range" min="-25" max="25" value={overlayRotation} onChange={(e) => setOverlayRotation(Number(e.target.value))} />
                </label>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Blend</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(['multiply', 'normal', 'darken'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBlendMode(mode)}
                        className={`rounded-md border px-2 py-1 text-xs capitalize transition-colors ${
                          blendMode === mode
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:bg-secondary'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                This free preview uses the real product image and lets you judge colour, silhouette, and proportion. It does not realistically fold fabric around your body; use paid AI Try-On only when you want that generated result.
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setStep('capture')}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
                <Button variant="outline" onClick={applyCategoryPreset}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Reset Fit
                </Button>
                <Button variant="outline" onClick={applyAutoPlacement} disabled={isAutoPlacing}>
                  {isAutoPlacing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                  )}
                  Auto Fit
                </Button>
                <Button variant="outline" onClick={cleanGarmentImage ? () => {
                  setCleanGarmentImage(null)
                  window.sessionStorage.removeItem(cleanedImageStorageKey(item.id))
                  setCleanupStatus('Using the original product image.')
                } : cleanGarmentBackground} disabled={isCleaningGarment}>
                  {isCleaningGarment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {cleanGarmentImage ? 'Use Original' : 'Clean Image'}
                </Button>
                <Button variant="outline" onClick={downloadFreePreview}>
                  <Download className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={startPaidTryOn}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Try-On (paid)
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Creating Your Try-On</h3>
              <p className="text-muted-foreground">
                This usually takes 5-15 seconds...
              </p>
            </div>
          )}

          {step === 'result' && resultImage && (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] max-h-[400px] bg-secondary rounded-lg overflow-hidden">
                <img
                  src={resultImage}
                  alt="Try-on result"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Try-On Complete
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Another
                </Button>
                <Button onClick={downloadResult}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Try-On Failed</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                {error}
              </p>
              <Button onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
