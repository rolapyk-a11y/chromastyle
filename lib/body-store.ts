'use client'

// Body/fit profile: on the account when signed in, otherwise in this browser.

import type { BodyProfile } from '@/lib/types'
import { loadBodyProfile, saveBodyProfile } from '@/lib/bodyGuide'

export async function loadBody(): Promise<{ profile: BodyProfile | undefined; signedIn: boolean }> {
  try {
    const res = await fetch('/api/profile/body', { cache: 'no-store' })
    if (res.ok) {
      const { profile } = (await res.json()) as { profile: BodyProfile | null }
      if (profile) return { profile, signedIn: true }
      // First visit on the account: carry over a profile made as a guest
      const local = loadBodyProfile()
      if (local) await saveBody(local, true)
      return { profile: local, signedIn: true }
    }
  } catch {
    /* fall through to this browser */
  }
  return { profile: loadBodyProfile(), signedIn: false }
}

export async function saveBody(profile: BodyProfile, signedIn: boolean): Promise<void> {
  saveBodyProfile(profile)
  if (!signedIn) return
  await fetch('/api/profile/body', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  }).catch(() => {})
}
