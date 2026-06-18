/**
 * Season palette data
 *
 * The best colours for each sub-season, plus universal neutrals. Shared by the
 * add-item sheet (swatches) and the outfit engine (season-correct suggestions),
 * so colour recommendations always come from the user's actual palette — never
 * random colours that fight their season, eyes, or skin tone.
 */

export interface PaletteColour {
  hex: string
  name: string
}

// Season-specific best colours
export const SEASON_COLOURS: Record<string, PaletteColour[]> = {
  'light-spring': [
    { hex: '#F5A886', name: 'Apricot' }, { hex: '#F4C4A4', name: 'Peach' },
    { hex: '#F8E080', name: 'Banana Yellow' }, { hex: '#94D4B0', name: 'Warm Mint' },
    { hex: '#A8C4DC', name: 'Powder Blue' }, { hex: '#F0B4C4', name: 'Taffy Pink' },
    { hex: '#B4D890', name: 'Pistachio' }, { hex: '#E8C058', name: 'Honey' },
  ],
  'true-spring': [
    { hex: '#F4892C', name: 'Coral Orange' }, { hex: '#F5B030', name: 'Golden Yellow' },
    { hex: '#48C898', name: 'Turquoise' }, { hex: '#70C870', name: 'Clear Green' },
    { hex: '#F9D840', name: 'Daisy Yellow' }, { hex: '#F09060', name: 'Warm Orange' },
  ],
  'warm-spring': [
    { hex: '#E8782A', name: 'Rich Coral' }, { hex: '#E8C430', name: 'Rich Yellow' },
    { hex: '#60B878', name: 'Warm Olive' }, { hex: '#D4942A', name: 'Warm Amber' },
    { hex: '#C87840', name: 'Caramel Brown' }, { hex: '#A0C050', name: 'Yellow-Green' },
  ],
  'light-summer': [
    { hex: '#A4C1F3', name: 'Powder Blue' }, { hex: '#BDA7DD', name: 'Pale Lavender' },
    { hex: '#D4B8C8', name: 'Soft Rose' }, { hex: '#A8CCC8', name: 'Cool Mint' },
    { hex: '#C8D0E4', name: 'Periwinkle' }, { hex: '#D8D0EC', name: 'Icy Lilac' },
  ],
  'true-summer': [
    { hex: '#CED6E0', name: 'Foggy Sky' }, { hex: '#A6B8D2', name: 'Bluebell Haze' },
    { hex: '#6F96A2', name: 'Ocean Slate' }, { hex: '#BDAECF', name: 'Lavender Dust' },
    { hex: '#E4C4CA', name: 'Hushed Blush' }, { hex: '#C4A8B8', name: 'Cool Mauve' },
  ],
  'soft-summer': [
    { hex: '#7598C4', name: 'Dusty Blue' }, { hex: '#998CBD', name: 'Muted Lavender' },
    { hex: '#C4A0A8', name: 'Dusty Rose' }, { hex: '#A0B4A4', name: 'Sage Grey' },
    { hex: '#98AEB4', name: 'Eucalyptus' }, { hex: '#78ABC6', name: 'Soft Blue' },
  ],
  'soft-autumn': [
    { hex: '#9CAF88', name: 'Soft Olive' }, { hex: '#D9927A', name: 'Muted Terracotta' },
    { hex: '#D99058', name: 'Faded Terracotta' }, { hex: '#BDBFA0', name: 'Light Sage' },
    { hex: '#D1B7A3', name: 'Soft Camel' }, { hex: '#C48793', name: 'Dusty Rose' },
  ],
  'true-autumn': [
    { hex: '#CC5500', name: 'Burnt Orange' }, { hex: '#DAA520', name: 'Goldenrod' },
    { hex: '#708238', name: 'Olive Green' }, { hex: '#800020', name: 'Burgundy' },
    { hex: '#B7410E', name: 'Rust' }, { hex: '#556B2F', name: 'Dark Olive' },
  ],
  'dark-autumn': [
    { hex: '#924819', name: 'Burnt Sienna' }, { hex: '#404C24', name: 'Army Green' },
    { hex: '#800000', name: 'Wine' }, { hex: '#8A3324', name: 'Paprika' },
    { hex: '#5C4033', name: 'Rich Brown' }, { hex: '#675100', name: 'Muddy Olive' },
  ],
  'dark-winter': [
    { hex: '#003153', name: 'Prussian Blue' }, { hex: '#015871', name: 'Deep Teal' },
    { hex: '#7D1B4D', name: 'Rich Plum' }, { hex: '#00491E', name: 'Deep Emerald' },
    { hex: '#5F2566', name: 'Dark Purple' }, { hex: '#64242E', name: 'Deep Burgundy' },
  ],
  'true-winter': [
    { hex: '#000000', name: 'Black' }, { hex: '#003087', name: 'Cobalt Blue' },
    { hex: '#CC0000', name: 'True Red' }, { hex: '#800080', name: 'Purple' },
    { hex: '#9B111E', name: 'Ruby Red' }, { hex: '#4B0082', name: 'Indigo' },
  ],
  'clear-winter': [
    { hex: '#DA4A94', name: 'Vivid Magenta' }, { hex: '#0000CD', name: 'Electric Blue' },
    { hex: '#9400D3', name: 'Vivid Violet' }, { hex: '#00CED1', name: 'Clear Turquoise' },
    { hex: '#BE74C9', name: 'Rich Orchid' }, { hex: '#FF1493', name: 'Deep Pink' },
  ],
}

// Universal neutrals shown for every season
export const NEUTRAL_COLOURS: PaletteColour[] = [
  { hex: '#F5F5F0', name: 'Off-White' },
  { hex: '#F2E4D0', name: 'Ivory Cream' },
  { hex: '#D2B48C', name: 'Tan' },
  { hex: '#C4A070', name: 'Camel' },
  { hex: '#8B7355', name: 'Warm Taupe' },
  { hex: '#808080', name: 'Mid Grey' },
  { hex: '#36454F', name: 'Charcoal' },
  { hex: '#003366', name: 'Deep Navy' },
  { hex: '#1A1A1A', name: 'Near Black' },
  { hex: '#FFFFFF', name: 'White' },
]

// All season + neutral colours for a sub-season (used for suggestions)
export function paletteFor(subSeason: string | undefined): PaletteColour[] {
  const season = subSeason ? (SEASON_COLOURS[subSeason] ?? []) : []
  return [...season, ...NEUTRAL_COLOURS]
}
