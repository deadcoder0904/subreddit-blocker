import browser from 'webextension-polyfill'

import { DEFAULTS, STORAGE_KEYS, SUPPORTED_HOST_PATTERNS } from '../shared/constants'
import { shouldBlockUrl } from '../shared/blocking'
import type { StorageData, TimeBlock } from '../shared/types'

// Ensure defaults are set on first install
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== 'install') return
  const data = (await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.theme,
    STORAGE_KEYS.dailyLockUntil,
    STORAGE_KEYS.dailyLockName,
    STORAGE_KEYS.timeBlocks,
  ])) as Partial<StorageData>

  const next: Partial<StorageData> = {}
  if (typeof data.blockedSubreddits === 'undefined') {
    next.blockedSubreddits = DEFAULTS.blockedSubreddits
  }
  if (typeof data.extensionEnabled === 'undefined') {
    next.extensionEnabled = DEFAULTS.extensionEnabled
  }
  if (typeof data.theme === 'undefined') next.theme = DEFAULTS.theme
  if (typeof data.dailyLockUntil === 'undefined') next.dailyLockUntil = DEFAULTS.dailyLockUntil
  if (typeof data.dailyLockName === 'undefined') next.dailyLockName = DEFAULTS.dailyLockName
  if (typeof data.timeBlocks === 'undefined') next.timeBlocks = DEFAULTS.timeBlocks
  if (Object.keys(next).length > 0) await browser.storage.local.set(next)
})

// Load user settings with sensible defaults
async function loadSettings(): Promise<StorageData> {
  const raw = (await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.dailyLockUntil,
    STORAGE_KEYS.dailyLockName,
    STORAGE_KEYS.timeBlocks,
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
    dailyLockName:
      typeof raw[STORAGE_KEYS.dailyLockName] === 'string'
        ? (raw[STORAGE_KEYS.dailyLockName] as string)
        : DEFAULTS.dailyLockName,
    timeBlocks: Array.isArray(raw[STORAGE_KEYS.timeBlocks])
      ? (raw[STORAGE_KEYS.timeBlocks] as TimeBlock[])
      : DEFAULTS.timeBlocks,
  }
}

async function redirectToBlocked(tabId: number) {
  await browser.tabs.update(tabId, { url: browser.runtime.getURL('blocked.html') })
}

async function checkAndMaybeRedirect(tab: { id?: number; url?: string }) {
  if (!tab?.url) return

  const settings = await loadSettings()
  if (shouldBlockUrl(settings, tab.url) && typeof tab.id === 'number') {
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
    url: [...SUPPORTED_HOST_PATTERNS] as unknown as string[],
  })
  await Promise.all(tabs.map((t) => checkAndMaybeRedirect(t)))
})
