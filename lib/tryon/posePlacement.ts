import type { ClothingItem } from '@/lib/types'

export interface TryOnPlacement {
  x: number
  y: number
  scale: number
  stretchX: number
  stretchY: number
  rotation: number
  confidence: number
}

type PoseLandmarkerModule = typeof import('@mediapipe/tasks-vision')
type PoseLandmarker = Awaited<ReturnType<PoseLandmarkerModule['PoseLandmarker']['createFromOptions']>>

let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null

function garmentKind(item: ClothingItem) {
  if (item.category === 'pants' || item.category === 'trousers') return 'bottom'
  if (item.category === 'outerwear') return 'outerwear'
  return 'top'
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function angle(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function getPoseLandmarker() {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = import('@mediapipe/tasks-vision').then(async ({
      FilesetResolver,
      PoseLandmarker,
    }) => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      )

      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      })
    })
  }

  return poseLandmarkerPromise
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function detectTryOnPlacement(
  imageData: string,
  item: ClothingItem,
): Promise<TryOnPlacement | null> {
  const image = await loadImage(imageData)
  const landmarker = await getPoseLandmarker()
  const result = landmarker.detect(image)
  const landmarks = result.landmarks?.[0]

  if (!landmarks) return null

  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  const leftAnkle = landmarks[27]
  const rightAnkle = landmarks[28]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null

  const shoulderCenter = {
    x: ((leftShoulder.x + rightShoulder.x) / 2) * 100,
    y: ((leftShoulder.y + rightShoulder.y) / 2) * 100,
  }
  const hipCenter = {
    x: ((leftHip.x + rightHip.x) / 2) * 100,
    y: ((leftHip.y + rightHip.y) / 2) * 100,
  }
  const shoulderWidth = distance(leftShoulder, rightShoulder) * 100
  const hipWidth = distance(leftHip, rightHip) * 100
  const torsoLength = distance(shoulderCenter, hipCenter)
  const bodyAngle = angle(
    { x: leftShoulder.x, y: leftShoulder.y },
    { x: rightShoulder.x, y: rightShoulder.y },
  )

  const visibility = [
    leftShoulder.visibility ?? 1,
    rightShoulder.visibility ?? 1,
    leftHip.visibility ?? 1,
    rightHip.visibility ?? 1,
  ]
  const confidence = visibility.reduce((sum, value) => sum + value, 0) / visibility.length

  const kind = garmentKind(item)

  if (kind === 'bottom') {
    const ankleY = leftAnkle && rightAnkle
      ? ((leftAnkle.y + rightAnkle.y) / 2) * 100
      : Math.min(92, hipCenter.y + torsoLength * 1.65)
    const legLength = Math.max(20, ankleY - hipCenter.y)

    return {
      x: hipCenter.x,
      y: hipCenter.y + legLength * 0.42,
      scale: Math.min(76, Math.max(34, hipWidth * 2.15)),
      stretchX: 92,
      stretchY: clamp((legLength / Math.max(torsoLength, 1)) * 72, 96, 136),
      rotation: Math.max(-18, Math.min(18, bodyAngle)),
      confidence,
    }
  }

  if (kind === 'outerwear') {
    return {
      x: (shoulderCenter.x + hipCenter.x) / 2,
      y: shoulderCenter.y + torsoLength * 0.58,
      scale: Math.min(82, Math.max(42, shoulderWidth * 2.2)),
      stretchX: 108,
      stretchY: clamp((torsoLength / Math.max(shoulderWidth, 1)) * 72, 98, 126),
      rotation: Math.max(-18, Math.min(18, bodyAngle)),
      confidence,
    }
  }

  const shoulderToHipRatio = shoulderWidth / Math.max(hipWidth, 1)

  return {
    x: (shoulderCenter.x + hipCenter.x) / 2,
    y: shoulderCenter.y + torsoLength * 0.47,
    scale: Math.min(72, Math.max(36, shoulderWidth * 1.9)),
    stretchX: clamp(shoulderToHipRatio * 98, 88, 116),
    stretchY: clamp((torsoLength / Math.max(shoulderWidth, 1)) * 66, 86, 118),
    rotation: Math.max(-18, Math.min(18, bodyAngle)),
    confidence,
  }
}
