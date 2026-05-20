import type { TimeBlock } from './types'

export const STORAGE_KEYS = {
  blockedSubreddits: 'blockedSubreddits',
  extensionEnabled: 'extensionEnabled',
  theme: 'theme',
  dailyLockUntil: 'dailyLockUntil',
  timeBlocks: 'timeBlocks',
} as const

export const DEFAULTS = {
  blockedSubreddits: [] as string[],
  extensionEnabled: true,
  theme: 'dark' as 'dark' | 'light',
  dailyLockUntil: 0 as number,
  timeBlocks: [] as TimeBlock[],
}

export const SUPPORTED_HOSTS = ['reddit.com', 'troddit.com', 'eddrit.com'] as const

export const SUPPORTED_HOST_PATTERNS = SUPPORTED_HOSTS.flatMap((host) => [
  `*://*.${host}/*`,
  `*://${host}/*`,
])

export const THEMES = ['dark', 'light'] as const
