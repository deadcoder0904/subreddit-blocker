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
    const match = url.pathname.match(/\/r\/([^/]+)/)
    if (!match) return null
    const name = match[1]?.toLowerCase()
    return name ? `/r/${name}` : null
  } catch {
    return null
  }
}

// Normalize a subreddit name into '/r/{name}' form
function formatSubreddit(name: string | undefined): string | null {
  const n = name?.trim().toLowerCase()
  if (!n) return null
  return `/r/${n}`
}

// Parse a single line/user entry into a normalized subreddit path or null
function parseSingleSubredditEntry(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  // Prefer robust URL-based extraction
  const fromUrl = extractSubreddit(s)
  if (fromUrl) return fromUrl
  // Fallback: accept `r/foo`, `/r/foo`, or bare `foo`
  const m = s.match(/^\/?(?:r\/)?([^/\s]+)/i)
  return formatSubreddit(m?.[1])
}

// Accepts lines like: r/askreddit, /r/askreddit, askreddit, full URLs
export function parseSubredditInput(input: string): string[] {
  const lines = input.split(/\r?\n/)
  const parsed = lines
    .map((line) => parseSingleSubredditEntry(line))
    .filter((v): v is string => !!v && v !== '/r/')

  return [...new Set(parsed)]
}
