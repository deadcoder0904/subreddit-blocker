import browser from 'webextension-polyfill'

import { DEFAULTS, REDDIT_HOST_PATTERNS, STORAGE_KEYS } from '../shared/constants'
import type { StorageData } from '../shared/types'

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

async function checkTabAndRedirect(tab: { id?: number | undefined; url?: string | undefined }) {
  if (!tab?.url) return

  const raw = (await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.dailyLockUntil,
  ])) as Record<string, unknown>
  const data: StorageData = {
    blockedSubreddits: Array.isArray(raw[STORAGE_KEYS.blockedSubreddits])
      ? (raw[STORAGE_KEYS.blockedSubreddits] as string[])
      : [],
    extensionEnabled:
      typeof raw[STORAGE_KEYS.extensionEnabled] === 'boolean'
        ? (raw[STORAGE_KEYS.extensionEnabled] as boolean)
        : true,
    dailyLockUntil:
      typeof raw[STORAGE_KEYS.dailyLockUntil] === 'number'
        ? (raw[STORAGE_KEYS.dailyLockUntil] as number)
        : 0,
  }

  const lockActive = typeof data.dailyLockUntil === 'number' && Date.now() < data.dailyLockUntil
  const effectiveEnabled = lockActive || data.extensionEnabled
  if (!effectiveEnabled || !data.blockedSubreddits?.length) return

  try {
    const url = new URL(tab.url)
    if (!url.hostname.includes('reddit.com')) return
    const m = url.pathname.match(/\/r\/([^/]+)/)
    if (!m) return
    const subreddit = `/r/${m[1].toLowerCase()}`
    if (data.blockedSubreddits.includes(subreddit) && tab.id) {
      await browser.tabs.update(tab.id, {
        url: browser.runtime.getURL('blocked.html'),
      })
    }
  } catch {
    // ignore parse errors
  }
}

// Listen for tab URL updates
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url) await checkTabAndRedirect(tab)
})

// Re-evaluate tabs when storage changes
browser.storage.onChanged.addListener(async () => {
  const tabs = await browser.tabs.query({
    url: [...REDDIT_HOST_PATTERNS] as unknown as string[],
  })
  await Promise.all(tabs.map((t) => checkTabAndRedirect(t)))
})
