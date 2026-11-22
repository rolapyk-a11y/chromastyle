// Danish colour words used both to build shop searches and to read colours back out of
// product titles. Hex values are representative mid-tones for menswear.

export interface ColourWord {
  word: string        // Danish search word
  hex: string
  aliases: RegExp     // matches the colour in Danish or English product titles
}

export const COLOUR_WORDS: ColourWord[] = [
  { word: 'creme', hex: '#EFE7D6', aliases: /\b(creme|cream|ecru|råhvid|off[- ]?white|ivory|elfenben|naturhvid)\b/i },
  { word: 'sand', hex: '#D8C7A8', aliases: /\b(sand|stone|sten|lys beige|light beige|oatmeal|havre)\b/i },
  { word: 'beige', hex: '#CDB89A', aliases: /\b(beige|khaki|kaki)\b/i },
  { word: 'camel', hex: '#B98E5F', aliases: /\b(camel|kamel|tan|karamel|caramel)\b/i },
  { word: 'cognac', hex: '#9A5B32', aliases: /\b(cognac|rust|rustbrun|tobacco|tobak)\b/i },
  { word: 'mørkebrun', hex: '#4E3629', aliases: /\b(mørkebrun|dark brown|chocolate|chokolade|brun|brown|espresso|muldvarp|mole)\b/i },
  { word: 'taupe', hex: '#A39282', aliases: /\b(taupe|greige|gråbeige|støvet muldvarp)\b/i },
  { word: 'varm grå', hex: '#B9B2A6', aliases: /\b(lysegrå|light gr[ae]y|gråmeleret|grey melange|heather)\b/i },
  { word: 'oliven', hex: '#6B6A45', aliases: /\b(oliven|olive|kakigrøn|army|militærgrøn)\b/i },
  { word: 'salvie', hex: '#A7B59A', aliases: /\b(salvie|sage|støvet grøn|dusty green|mint)\b/i },
  { word: 'fersken', hex: '#E3B49A', aliases: /\b(fersken|peach|abrikos|apricot|koral|coral|laks|salmon)\b/i },
  { word: 'lyseblå', hex: '#A8C4DC', aliases: /\b(lyseblå|light blue|sky blue|isblå|støvet blå|dusty blue)\b/i },
  { word: 'bordeaux', hex: '#7A3B40', aliases: /\b(bordeaux|burgundy|vinrød|wine|maroon)\b/i },
  { word: 'marineblå', hex: '#2B3350', aliases: /\b(marineblå|navy|mørkeblå|dark blue)\b/i },
  { word: 'denim', hex: '#4E6480', aliases: /\b(denimblå|denim blue|mid blue|mellemblå)\b/i },
  { word: 'grå', hex: '#8C8C8C', aliases: /\b(grå|gr[ae]y|koksgrå|charcoal|antracit)\b/i },
  { word: 'sort', hex: '#151515', aliases: /\b(sort|black|denimsort)\b/i },
  { word: 'hvid', hex: '#F7F7F5', aliases: /\b(hvid|white)\b/i },
  { word: 'grøn', hex: '#3F6B4A', aliases: /\b(grøn|green|mørkegrøn|forest)\b/i },
  { word: 'rød', hex: '#B0413E', aliases: /\b(rød|red)\b/i },
  { word: 'gul', hex: '#E8C058', aliases: /\b(gul|yellow|sennep|mustard|okker|ochre)\b/i },
]

/** The first colour mentioned in a product title, if any. */
export function colourFromTitle(title: string): ColourWord | null {
  let best: { c: ColourWord; at: number } | null = null
  for (const c of COLOUR_WORDS) {
    const m = c.aliases.exec(title)
    if (m && (!best || m.index < best.at)) best = { c, at: m.index }
  }
  return best?.c ?? null
}

export function colourByWord(word: string): ColourWord | undefined {
  return COLOUR_WORDS.find((c) => c.word === word)
}
