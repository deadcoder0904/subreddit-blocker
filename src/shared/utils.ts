// Utilities for parsing inputs and extracting subreddit from URLs

import { SUPPORTED_HOSTS } from './constants'

export function isSupportedHostUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname.toLowerCase()
    return SUPPORTED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

export const isRedditUrl = isSupportedHostUrl

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

export function formatListForTextarea(list: string[]): string {
  return list.map((s) => (s.startsWith('/r/') ? s : s.startsWith('r/') ? `/${s}` : s)).join('\n')
}

export function mergeSubredditLists(...lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}

export function getDaysText(days: number[]): string {
  if (days.length === 7) return 'Daily'
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  /* eslint-disable-next-line unicorn/no-array-sort */
  const sortedDays = [...days].sort((a, b) => a - b)
  return sortedDays.map((d) => dayNames[d]).join(', ')
}

export function formatSubredditDisplayName(name: string): string {
  if (name.startsWith('/r/')) return name
  if (name.startsWith('r/')) return '/' + name
  return `/r/${name}`
}

export interface QuickBlockResult {
  success: boolean
  message: string
  nextList?: string[]
  isError?: boolean
}

export function handleQuickBlockInput(inputValue: string, currentList: string[]): QuickBlockResult {
  const additions = parseSubredditInput(inputValue)
  if (additions.length === 0) {
    return { success: false, message: 'Enter a subreddit or supported URL.', isError: true }
  }

  const alreadyBlocked = additions.filter((name) => currentList.includes(name))
  const newAdditions = additions.filter((name) => !currentList.includes(name))

  if (newAdditions.length === 0) {
    const displayNames = alreadyBlocked.map(formatSubredditDisplayName).join(', ')
    return { success: false, message: `${displayNames} is already blocked.`, isError: true }
  }

  const nextList = mergeSubredditLists(currentList, newAdditions)
  const displayNames = newAdditions.map(formatSubredditDisplayName).join(', ')
  return { success: true, message: `Blocked ${displayNames}`, nextList }
}
