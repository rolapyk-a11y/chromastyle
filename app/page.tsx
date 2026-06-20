import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Camera, Palette, Shirt, ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon-192.png" alt="Outfitter" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-lg">Outfitter</span>
          </div>
          <Button asChild size="sm">
            <Link href="/analyze">Start analyse</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gratis · Ingen konto krævet</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          Find de farver der{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-400">
            klæder dig bedst
          </span>
        </h1>

        <p className="text-lg text-gray-500 max-w-lg mx-auto">
          Upload et foto — appen finder din farvesæson og anbefaler tøj i de nuancer der passer præcist til dig.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button size="lg" asChild className="text-base px-8 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 border-0">
            <Link href="/analyze">
              Analysér mine farver
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8">
            <Link href="/wardrobe">
              Se garderobe
            </Link>
          </Button>
        </div>
      </section>

      {/* Season swatches */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: 'Spring', colors: ['#F9C784', '#F4845F', '#C2E0C6', '#F7E1A0'] },
            { name: 'Summer', colors: ['#B8D4E8', '#D4A5C9', '#C8DDD0', '#E8C4C4'] },
            { name: 'Autumn', colors: ['#C4843C', '#8B4513', '#6B8E4E', '#C8A882'] },
            { name: 'Winter', colors: ['#1B2A4A', '#8B0000', '#2F4F4F', '#F0F0F0'] },
          ].map(season => (
            <div key={season.name} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="grid grid-cols-2">
                {season.colors.map(c => (
                  <div key={c} className="aspect-square" style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="text-center text-xs font-medium py-2 text-gray-600">{season.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-4 space-y-10">
          <h2 className="text-2xl font-bold text-center">Sådan virker det</h2>
          <div className="space-y-6">
            {[
              {
                icon: Camera,
                step: '1',
                title: 'Tag et foto',
                desc: 'Upload et selfie i dagslys. Appen analyserer din hudtone, hårfarve og øjenfarve.',
              },
              {
                icon: Palette,
                step: '2',
                title: 'Få din farvesæson',
                desc: 'Du får din præcise sub-sæson — fx Light Spring eller True Autumn — med en palette af dine bedste farver.',
              },
              {
                icon: Shirt,
                step: '3',
                title: 'Shop og byg din garderobe',
                desc: 'Se produkter matchet til dine eksakte farver. Tilføj tøj du ejer og få outfit-forslag.',
              },
            ].map(item => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Button size="lg" asChild className="text-base px-8 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 border-0">
              <Link href="/analyze">
                Start gratis analyse
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between text-sm text-gray-400">
          <span className="font-medium text-gray-700">Outfitter</span>
          <span>Farveanalyse · Ingen konto krævet</span>
        </div>
      </footer>

    </div>
  )
}
