'use client'

import { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, RotateCcw, Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  isProcessing?: boolean
}

export function CameraCapture({ onCapture, isProcessing }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoConstraints = {
    width: 720,
    height: 720,
    facingMode,
  }

  const handleUserMedia = useCallback(() => {
    setHasPermission(true)
    setCameraError(null)
  }, [])

  const handleUserMediaError = useCallback(() => {
    setHasPermission(false)
    setCameraError('Unable to access camera. Please allow camera permissions or upload a photo instead.')
  }, [])

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
    }
  }, [])

  const retake = useCallback(() => {
    setCapturedImage(null)
  }, [])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setCapturedImage(result)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleAnalyze = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage)
    }
  }, [capturedImage, onCapture])

  return (
    <div className="space-y-4">
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square max-w-md mx-auto bg-secondary/50">
            {capturedImage ? (
              // Show captured image
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : hasPermission === false || cameraError ? (
              // Show error state
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{cameraError}</p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </Button>
              </div>
            ) : (
              // Show webcam
              <>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover"
                  mirrored={facingMode === 'user'}
                />
                {/* Camera overlay guide */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/30 rounded-full" />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white/80 text-sm bg-black/40 inline-block px-3 py-1 rounded-full">
                      Position your face in the circle
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {capturedImage ? (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={retake}
              disabled={isProcessing}
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Retake
            </Button>
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={isProcessing}
              className={cn(isProcessing && 'opacity-80')}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Analyze Colors
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {hasPermission && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  className="rounded-full w-12 h-12"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={capture}
                  className="rounded-full w-16 h-16"
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full w-12 h-12"
            >
              <Upload className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Tips */}
      <div className="bg-secondary/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Tips for best results:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Use natural lighting (near a window is ideal)</li>
          <li>Avoid direct sunlight or harsh artificial light</li>
          <li>Remove glasses and keep hair away from face</li>
          <li>Face the camera directly with a neutral expression</li>
        </ul>
      </div>
    </div>
  )
}
