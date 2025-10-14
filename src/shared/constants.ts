export const STORAGE_KEYS = {
  blockedSubreddits: 'blockedSubreddits',
  extensionEnabled: 'extensionEnabled',
  theme: 'theme',
  dailyLockUntil: 'dailyLockUntil',
} as const

export const DEFAULTS = {
  blockedSubreddits: [] as string[],
  extensionEnabled: true,
  theme: 'dark' as 'dark' | 'light',
  dailyLockUntil: 0 as number,
}

export const REDDIT_HOST_PATTERNS = [
  '*://*.reddit.com/*',
  '*://reddit.com/*',
  '*://old.reddit.com/*',
] as const

export const THEMES = ['dark', 'light'] as const
