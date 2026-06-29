'use client'

/**
 * Realistic (AI) try-on — client helpers (Phase 1b)
 *
 * Talks to the existing /api/try-on route (FASHN.ai). Stores the user's
 * full-body photo locally so it's reused across try-ons, and maps our garment
 * categories onto FASHN's. Requires FASHN_API_KEY set on the server.
 */

import type { ItemCategory } from './types'

const BODY_PHOTO_KEY = 'chromastyle_body_photo'

export function getBodyPhoto(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(BODY_PHOTO_KEY) } catch { return null }
}

export function saveBodyPhoto(dataUrl: string): void {
  try { localStorage.setItem(BODY_PHOTO_KEY, dataUrl) } catch { /* quota */ }
}

export function clearBodyPhoto(): void {
  try { localStorage.removeItem(BODY_PHOTO_KEY) } catch { /* noop */ }
}

// ── Access code (locks the paid try-on to the owner) ──
const ACCESS_CODE_KEY = 'chromastyle_tryon_code'

export function getAccessCode(): string {
  if (typeof window === 'undefined') return ''
  try { return localStorage.getItem(ACCESS_CODE_KEY) ?? '' } catch { return '' }
}

export function saveAccessCode(code: string): void {
  try { localStorage.setItem(ACCESS_CODE_KEY, code) } catch { /* noop */ }
}

export type FashnCategory = 'tops' | 'bottoms'

// Map our category to FASHN's. Returns null for items try-on can't handle (shoes, accessories).
export function fashnCategory(cat: ItemCategory): FashnCategory | null {
  if (cat === 'top' || cat === 'jacket') return 'tops'
  if (cat === 'bottom') return 'bottoms'
  return null
}

export interface TryOnResponse {
  resultImage?: string
  error?: string
  needsApiKey?: boolean
  locked?: boolean
}

export async function runRealisticTryOn(params: {
  modelImage: string
  garmentImage: string
  category: FashnCategory
}): Promise<TryOnResponse> {
  try {
    const res = await fetch('/api/try-on', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelImage: params.modelImage,
        garmentImage: params.garmentImage,
        category: params.category,
        accessCode: getAccessCode(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error || 'Try-on failed', needsApiKey: data.needsApiKey, locked: data.locked }
    return { resultImage: data.resultImage }
  } catch {
    return { error: 'Network error during try-on. Please try again.' }
  }
}

// Downscale a full-body photo before storing/sending (keeps localStorage + payload small).
export function downscalePhoto(file: File, max = 768, quality = 0.85): Promise<string> {
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
