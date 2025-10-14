import browser from 'webextension-polyfill'

import { DEFAULTS, REDDIT_HOST_PATTERNS, STORAGE_KEYS } from '../shared/constants'
import type { StorageData } from '../shared/types'
import { extractSubreddit, isRedditUrl } from '../shared/utils'

// Ensure defaults are set on first install
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== 'install') return
  const data = (await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.theme,
  ])) as Partial<StorageData>

  const next: Partial<StorageData> = {}
  if (typeof data.blockedSubreddits === 'undefined') {
    next.blockedSubreddits = DEFAULTS.blockedSubreddits
  }
  if (typeof data.extensionEnabled === 'undefined') {
    next.extensionEnabled = DEFAULTS.extensionEnabled
  }
  if (typeof data.theme === 'undefined') next.theme = DEFAULTS.theme
  if (Object.keys(next).length > 0) await browser.storage.local.set(next)
})

// Load user settings with sensible defaults
async function loadSettings(): Promise<StorageData> {
  const raw = (await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.dailyLockUntil,
  ])) as Record<string, unknown>
  return {
    blockedSubreddits: Array.isArray(raw[STORAGE_KEYS.blockedSubreddits])
      ? (raw[STORAGE_KEYS.blockedSubreddits] as string[])
      : DEFAULTS.blockedSubreddits,
    extensionEnabled:
      typeof raw[STORAGE_KEYS.extensionEnabled] === 'boolean'
        ? (raw[STORAGE_KEYS.extensionEnabled] as boolean)
        : DEFAULTS.extensionEnabled,
    dailyLockUntil:
      typeof raw[STORAGE_KEYS.dailyLockUntil] === 'number'
        ? (raw[STORAGE_KEYS.dailyLockUntil] as number)
        : DEFAULTS.dailyLockUntil,
  }
}

function isLockActive(until?: number): boolean {
  return typeof until === 'number' && until > 0 && Date.now() < until
}

async function redirectToBlocked(tabId: number) {
  await browser.tabs.update(tabId, { url: browser.runtime.getURL('blocked.html') })
}

async function checkAndMaybeRedirect(tab: { id?: number; url?: string }) {
  if (!tab?.url) return

  const settings = await loadSettings()
  const enabled = isLockActive(settings.dailyLockUntil) || settings.extensionEnabled
  if (!enabled || !settings.blockedSubreddits?.length) return

  // Quick host guard
  if (!isRedditUrl(tab.url)) return

  const subreddit = extractSubreddit(tab.url)
  if (!subreddit) return

  if (settings.blockedSubreddits.includes(subreddit) && typeof tab.id === 'number') {
    await redirectToBlocked(tab.id)
  }
}

// Listen for tab URL updates
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url) await checkAndMaybeRedirect(tab)
})

// Re-evaluate tabs when storage changes
browser.storage.onChanged.addListener(async () => {
  const tabs = await browser.tabs.query({
    url: [...REDDIT_HOST_PATTERNS] as unknown as string[],
  })
  await Promise.all(tabs.map((t) => checkAndMaybeRedirect(t)))
})
