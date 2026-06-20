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
  title: 'Outfitter — Farveanalyse & Outfit-forslag',
  description: 'Find din farvesæson og få outfit-forslag der passer til dig. Gratis AI-farveanalyse.',
  keywords: ['farveanalyse', 'farvesæson', 'outfit', 'tøj', 'personlig stil', 'colour analysis'],

  manifest: '/manifest.json',

  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },

  // PWA / home screen settings
  appleWebApp: {
    capable: true,
    title: 'Outfitter',
    statusBarStyle: 'default',
  },

  // Open Graph
  openGraph: {
    title: 'Outfitter — Find din farvesæson',
    description: 'Upload et foto og find din farvesæson på sekunder. Gratis, ingen konto.',
    type: 'website',
    siteName: 'Outfitter',
  },

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
}

export const viewport: Viewport = {
  // Matches the manifest background colour — prevents white flash on launch
  themeColor: '#ffffff',
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
    <html lang="en" className="bg-background">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}
      >
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
