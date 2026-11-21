import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="w-5 h-5 text-primary" />
            ChromaStyle
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
