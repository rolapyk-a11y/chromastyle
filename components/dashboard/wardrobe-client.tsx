'use client'

import { useState, useMemo } from 'react'
import { ColorAnalysis, ClothingItem, Season, SEASON_INFO, type BodyProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ClothingCard } from './clothing-card'
import { TryOnModal } from './try-on-modal'
import { MyWardrobe } from './my-wardrobe'
import { ColourMatches } from './colour-matches'
import { PersonalStyleGuide } from './personal-style-guide'
import { addWardrobeItem, loadWardrobe } from '@/lib/closet/wardrobe-store'
import type { CatalogProduct } from '@/lib/productCatalog'
import {
  Search,
  Filter,
  Palette,
  Sparkles,
  SlidersHorizontal,
  X,
  AlertCircle,
  Shirt,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

type MainTab = 'colours' | 'shop' | 'my-wardrobe'

interface WardrobeClientProps {
  colorAnalysis: ColorAnalysis | undefined
  clothingItems: ClothingItem[]
  savedItemIds: string[]
  initialMainTab?: MainTab
  /** Signed-in users keep their closet under Mit skab; guests use the browser wardrobe here. */
  signedIn?: boolean
}

type FilterBrand = 'all' | 'H&M' | 'Zara' | 'Toj Eksperten'
type FilterCategory = 'all' | 'tops' | 'shirts' | 'outerwear' | 'pants'
type SortOption = 'recommended' | 'price-low' | 'price-high' | 'trending'

// Helper to calculate color similarity
function colorDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  
  return Math.sqrt(
    Math.pow(r2 - r1, 2) + 
    Math.pow(g2 - g1, 2) + 
    Math.pow(b2 - b1, 2)
  )
}

function isColorMatch(itemColors: string[], userColors: string[], threshold = 100): boolean {
  for (const itemColor of itemColors) {
    for (const userColor of userColors) {
      if (colorDistance(itemColor, userColor) < threshold) {
        return true
      }
    }
  }
  return false
}

export function WardrobeClient({
  colorAnalysis,
  clothingItems,
  savedItemIds: initialSavedIds,
  initialMainTab = 'colours',
  signedIn = false,
}: WardrobeClientProps) {
  const [mainTab, setMainTab] = useState<MainTab>(signedIn && initialMainTab === 'my-wardrobe' ? 'colours' : initialMainTab)
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | undefined>()
  const [ownedMsg, setOwnedMsg] = useState<string | null>(null)

  async function addOwned(p: CatalogProduct) {
    try {
      await loadWardrobe()
      await addWardrobeItem({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: p.name,
        category: p.category,
        color_hex: p.colorHex,
        color_name: p.colorName ?? p.colorHex,
        brand: p.brand,
        image_url: p.image_url,
        created_at: new Date().toISOString(),
      })
      setOwnedMsg(signedIn ? `${p.name} er lagt i Mit skab.` : `${p.name} er lagt i dit skab i denne browser.`)
    } catch (e) {
      setOwnedMsg(e instanceof Error ? e.message : 'Kunne ikke gemme')
    }
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [brandFilter, setBrandFilter] = useState<FilterBrand>('all')
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [showOnlyMatching, setShowOnlyMatching] = useState(!!colorAnalysis)
  const [sortBy, setSortBy] = useState<SortOption>('recommended')
  const [savedItemIds, setSavedItemIds] = useState<string[]>(initialSavedIds)
  const [showFilters, setShowFilters] = useState(false)
  const [tryOnItem, setTryOnItem] = useState<ClothingItem | null>(null)

  const userSeason = colorAnalysis?.season
  const userColors = colorAnalysis?.best_colors || []

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...clothingItems]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.style_tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Brand filter
    if (brandFilter !== 'all') {
      items = items.filter(item => item.brand === brandFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter)
    }

    // Color matching filter
    if (showOnlyMatching && userColors.length > 0) {
      items = items.filter(item => isColorMatch(item.colors, userColors))
    }

    // Season filter (if user has analysis)
    if (userSeason && showOnlyMatching) {
      items = items.filter(item => item.seasons.includes(userSeason))
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        items.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        items.sort((a, b) => b.price - a.price)
        break
      case 'trending':
        items.sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0))
        break
      case 'recommended':
      default:
        // Sort by color match score + trending
        if (userColors.length > 0) {
          items.sort((a, b) => {
            const aMatch = isColorMatch(a.colors, userColors) ? 1 : 0
            const bMatch = isColorMatch(b.colors, userColors) ? 1 : 0
            const aSeasonMatch = userSeason && a.seasons.includes(userSeason) ? 1 : 0
            const bSeasonMatch = userSeason && b.seasons.includes(userSeason) ? 1 : 0
            const aTrending = a.is_trending ? 0.5 : 0
            const bTrending = b.is_trending ? 0.5 : 0
            
            return (bMatch + bSeasonMatch + bTrending) - (aMatch + aSeasonMatch + aTrending)
          })
        }
        break
    }

    return items
  }, [clothingItems, searchQuery, brandFilter, categoryFilter, showOnlyMatching, sortBy, userColors, userSeason])

  const handleSaveToggle = async (itemId: string) => {
    const isSaved = savedItemIds.includes(itemId)
    
    // Optimistic update
    if (isSaved) {
      setSavedItemIds(prev => prev.filter(id => id !== itemId))
    } else {
      setSavedItemIds(prev => [...prev, itemId])
    }

    // API call
    try {
      const response = await fetch('/api/saved-items', {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clothing_item_id: itemId })
      })

      if (!response.ok) {
        // Revert on error
        if (isSaved) {
          setSavedItemIds(prev => [...prev, itemId])
        } else {
          setSavedItemIds(prev => prev.filter(id => id !== itemId))
        }
      }
    } catch {
      // Revert on error
      if (isSaved) {
        setSavedItemIds(prev => [...prev, itemId])
      } else {
        setSavedItemIds(prev => prev.filter(id => id !== itemId))
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
          <p className="text-muted-foreground mt-1">
            {colorAnalysis
              ? 'Tøj i dine farver og en pasform, der klæder dig'
              : 'Tøj fra vores partnerbutikker'
            }
          </p>
        </div>
        {colorAnalysis && (
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg bg-gradient-to-r ${SEASON_INFO[colorAnalysis.season].gradient}`} />
            <span className="text-sm font-medium capitalize">{colorAnalysis.sub_season?.replace(/-/g, ' ')}</span>
          </div>
        )}
      </div>

      {!signedIn && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="flex-1 min-w-[12rem]">
              Du er ikke logget ind. Det, du lægger i skabet her, gemmes kun i denne browser.
              Log ind for at se dit skab og dine outfits på alle dine enheder.
            </p>
            <Button asChild size="sm"><Link href="/auth/login">Log ind</Link></Button>
          </CardContent>
        </Card>
      )}

      <PersonalStyleGuide colorAnalysis={colorAnalysis} onBodyProfile={setBodyProfile} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          ...(!signedIn ? [{ id: 'my-wardrobe' as const, label: 'Mit skab', icon: Shirt }] : []),
          { id: 'colours' as const, label: 'I dine farver', icon: Palette },
          { id: 'shop' as const, label: 'Alle produkter', icon: Search },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              mainTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {signedIn && (
        <p className="text-sm text-muted-foreground">
          Dit eget tøj ligger under <Link href="/dashboard/closet" className="underline">Mit skab</Link>, og dine outfits under{' '}
          <Link href="/dashboard/outfits" className="underline">Outfits</Link>.
        </p>
      )}

      {ownedMsg && <p className="text-sm text-muted-foreground">{ownedMsg}</p>}

      {mainTab === 'colours' && (
        <ColourMatches colorAnalysis={colorAnalysis} bodyProfile={bodyProfile} onAddToInventory={addOwned} />
      )}

      {mainTab === 'my-wardrobe' && (
        <MyWardrobe colorAnalysis={colorAnalysis} />
      )}

      {mainTab === 'shop' && (<>

      {/* No analysis warning */}
      {!colorAnalysis && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm">
                Lav din farveanalyse først, så bliver anbefalingerne personlige.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/analyze">Lav analyse</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søg på navn, mærke eller stil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick filters */}
          <div className="flex gap-2">
            {colorAnalysis && (
              <Button
                variant={showOnlyMatching ? 'default' : 'outline'}
                onClick={() => setShowOnlyMatching(!showOnlyMatching)}
                className="gap-2"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Mine farver</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtre</span>
            </Button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mærke</label>
                  <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as FilterBrand)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle mærker</SelectItem>
                      <SelectItem value="H&M">H&M</SelectItem>
                      <SelectItem value="Zara">Zara</SelectItem>
                      <SelectItem value="Toj Eksperten">Toj Eksperten</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Kategori</label>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as FilterCategory)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle kategorier</SelectItem>
                      <SelectItem value="tops">Overdele</SelectItem>
                      <SelectItem value="shirts">Skjorter</SelectItem>
                      <SelectItem value="outerwear">Overtøj</SelectItem>
                      <SelectItem value="pants">Bukser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Sortér efter</label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Anbefalet</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="trending">Populært</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(brandFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBrandFilter('all')
                        setCategoryFilter('all')
                        setSearchQuery('')
                      }}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
        </p>
        {showOnlyMatching && colorAnalysis && (
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Viser tøj, der passer til dine farver</span>
          </div>
        )}
      </div>

      {/* Clothing Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              isSaved={savedItemIds.includes(item.id)}
              onSaveToggle={handleSaveToggle}
              userColors={userColors}
              userSeason={userSeason}
              onTryOn={setTryOnItem}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Ingen produkter fundet</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      )}

      {tryOnItem && (
        <TryOnModal item={tryOnItem} isOpen={!!tryOnItem} onClose={() => setTryOnItem(null)} />
      )}
      </>)}
    </div>
  )
}
