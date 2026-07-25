import TurndownService from 'turndown'

// Éléments porteurs d'une vraie mise en forme. Sans l'un d'eux, le HTML du
// presse-papiers n'apporte rien de plus que sa version texte brut.
// <img> est volontairement absent : une image seule ne justifie pas de
// réécrire le collage.
const FORMATTING_SELECTOR =
  'strong, b, em, i, s, del, code, pre, a[href], h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table'

// Marqueurs markdown. Si le texte brut en contient déjà, la source copiée
// *était* du markdown : le reconstruire depuis le HTML ne ferait
// qu'échapper les astérisques et les backticks.
const MARKDOWN_MARKERS = [
  /\*\*[^*\n]+\*\*/, // **gras**
  /(^|\s)_[^_\n]+_(\s|$)/, // _italique_
  /`[^`\n]+`/, // `code`
  /^```/m, // bloc de code clôturé
  /^#{1,6}\s/m, // titre
  /^\s*[-*+]\s/m, // liste à puces
  /^\s*\d+\.\s/m, // liste numérotée
  /^\s*>\s/m, // citation
  /\[[^\]\n]+\]\([^)\n]+\)/, // [lien](url)
  /^\s*\|.*\|/m, // tableau
]

export const looksLikeMarkdown = (text: string): boolean =>
  MARKDOWN_MARKERS.some(marker => marker.test(text))

export const htmlHasFormatting = (html: string): boolean => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.querySelector(FORMATTING_SELECTOR) !== null
}

const service = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
})

// Les data URI en base64 pèsent souvent plusieurs centaines de kilo-octets :
// on garde le texte alternatif plutôt que de noyer le message
service.addRule('imageWithoutDataUri', {
  filter: 'img',
  replacement: (_content, node) => {
    const element = node as HTMLElement
    const alt = element.getAttribute('alt') || 'image'
    const src = element.getAttribute('src') || ''
    return /^https?:\/\//.test(src) ? `![${alt}](${src})` : `![${alt}]`
  },
})

// turndown aligne le contenu des listes sur trois espaces après la puce
// (« -   item »). C'est du markdown valide mais peu lisible dans une zone de
// saisie, où le texte est lu tel quel.
export const normalizeListSpacing = (markdown: string): string =>
  markdown
    .replace(/^(\s*)([-*+])[ \t]{2,}/gm, '$1$2 ')
    .replace(/^(\s*)(\d+\.)[ \t]{2,}/gm, '$1$2 ')

/**
 * Markdown à insérer pour un collage donné, ou null pour laisser le
 * navigateur coller nativement (ce qui préserve déjà le texte brut).
 */
export const markdownFromPaste = (clipboard: DataTransfer): string | null => {
  const html = clipboard.getData('text/html')
  if (!html) return null

  const plain = clipboard.getData('text/plain')
  if (plain && looksLikeMarkdown(plain)) return null
  if (!htmlHasFormatting(html)) return null

  const markdown = normalizeListSpacing(service.turndown(html)).trim()
  if (!markdown || markdown === plain.trim()) return null

  return markdown
}
