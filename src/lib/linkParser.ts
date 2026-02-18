/**
 * Parses [[Title]] style internal links from text content.
 * Returns array of referenced article titles.
 */
export function extractInternalLinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const matches: string[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim())
  }
  return [...new Set(matches)]
}

/**
 * Replaces [[Title]] links in HTML/text with anchor tags.
 * articleMap: Map<title (lowercase), {slug, exists}>
 */
export function renderInternalLinks(
  html: string,
  articleMap: Map<string, { slug: string; exists: boolean }>
): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (_match, title) => {
    const key = title.trim().toLowerCase()
    const article = articleMap.get(key)
    if (!article) {
      return `<span class="broken-link" title="Artikel nicht gefunden">[[${title}]]</span>`
    }
    return `<a href="#/articles/${article.slug}" class="internal-link">${title}</a>`
  })
}

/**
 * Generates a URL-safe slug from a title, with collision suffix support.
 */
export function generateSlug(title: string, suffix?: number): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const base = title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return suffix ? `${base}-${suffix}` : base
}
