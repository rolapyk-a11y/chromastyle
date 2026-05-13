'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Webcam from 'react-webcam'
import { ClothingItem } from '@/lib/types'
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
  Loader2, 
  Download, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TryOnModalProps {
  item: ClothingItem | null
  isOpen: boolean
  onClose: () => void
}

type Step = 'capture' | 'processing' | 'result' | 'error'

export function TryOnModal({ item, isOpen, onClose }: TryOnModalProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<Step>('capture')
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(true)

  const reset = useCallback(() => {
    setStep('capture')
    setModelImage(null)
    setResultImage(null)
    setError(null)
  }, [])

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

  const startTryOn = useCallback(async () => {
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
          category: item.category === 'pants' ? 'bottoms' : 
                   item.category === 'outerwear' ? 'tops' : 'auto',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsApiKey) {
          setError('Virtual try-on requires a FASHN API key. Please configure the FASHN_API_KEY environment variable.')
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
                    <Button onClick={startTryOn}>
                      Try On
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
