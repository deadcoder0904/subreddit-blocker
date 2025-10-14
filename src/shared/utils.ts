// Utilities for parsing inputs and extracting subreddit from URLs

export function isRedditUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return /(^|\.)reddit\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}

export function extractSubreddit(urlStr: string): string | null {
  try {
    const url = new URL(urlStr, 'https://www.reddit.com')
    const match = url.pathname.match(/\/r\/([^\/]+)/)
    if (!match) return null
    const name = match[1]?.toLowerCase()
    return name ? `r/${name}` : null
  } catch {
    return null
  }
}

// Accepts lines like: r/askreddit, /r/askreddit, askreddit, full URLs
export function parseSubredditInput(input: string): string[] {
  const lines = input.split(/\r?\n/)
  const parsed = lines
    .map((raw) => {
      const s = raw.trim()
      if (!s) return null
      // Try as URL first
      const fromUrl = extractSubreddit(s)
      if (fromUrl) return fromUrl
      // Fallback simple parse: optional r/ prefix, stop at next '/'
      const m = s.match(/^(?:r\/)?([^\/\s]+)/i)
      const name = m?.[1]?.toLowerCase()
      if (!name) return null
      return `r/${name}`
    })
    .filter((v): v is string => !!v && v !== 'r/')

  return [...new Set(parsed)]
}

