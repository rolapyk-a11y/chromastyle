'use client'

/**
 * Background removal for garment photos (paper-doll try-on).
 *
 * Wraps @imgly/background-removal (free, WASM, runs entirely in the browser) and
 * caches results for the session so each photo is only cut out once. If the
 * package isn't installed yet, or removal fails, it falls back to the original
 * image — so the try-on view always renders something.
 *
 * The model (~a few MB) downloads on first use and is cached by the browser.
 */

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export async function removeGarmentBackground(src: string): Promise<string> {
  if (!src) return src
  if (cache.has(src)) return cache.get(src)!
  const existing = inflight.get(src)
  if (existing) return existing

  const job = (async () => {
    try {
      // @ts-ignore — optional dependency, resolved at runtime after `npm install`
      const mod: any = await import('@imgly/background-removal')
      const removeBackground = mod.removeBackground ?? mod.default?.removeBackground ?? mod.default
      const blob: Blob = await removeBackground(src)
      const dataUrl = await blobToDataUrl(blob)
      cache.set(src, dataUrl)
      return dataUrl
    } catch {
      // Package missing or removal failed — show the original photo instead.
      cache.set(src, src)
      return src
    } finally {
      inflight.delete(src)
    }
  })()

  inflight.set(src, job)
  return job
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
