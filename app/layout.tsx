import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'ChromaStyle — Colour Analysis',
  description: 'Discover your seasonal colour palette and find clothing that enhances your natural features. Free AI-powered colour analysis and outfit recommendations.',
  keywords: ['colour analysis', 'seasonal colours', 'personal colour', 'style guide', 'outfit recommendations', 'fashion'],

  // PWA / home screen settings
  appleWebApp: {
    capable: true,
    title: 'ChromaStyle',
    statusBarStyle: 'black-translucent', // lets the app bleed under the iOS status bar
  },

  // Open Graph (looks good when shared on social/WhatsApp)
  openGraph: {
    title: 'ChromaStyle — Discover Your Colour Season',
    description: 'Upload a photo and find out your seasonal colour type in seconds. Free, no sign-up needed.',
    type: 'website',
    siteName: 'ChromaStyle',
  },

  // Prevents phone numbers / emails being auto-linked
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
}

export const viewport: Viewport = {
  // Matches the manifest background colour — prevents white flash on launch
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a0a14' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a14' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Prevents layout breaking if user pinch-zooms
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}
      >
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
