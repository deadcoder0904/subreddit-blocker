import browser from 'webextension-polyfill'

import { STORAGE_KEYS } from '../shared/constants'

function setThemeAttr(theme?: string) {
  const t = theme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  document.body.setAttribute('data-theme', t)
}

async function init() {
  try {
    const data = await browser.storage.local.get(STORAGE_KEYS.theme)
    setThemeAttr((data as Record<string, string | undefined>)?.[STORAGE_KEYS.theme])
  } catch {
    // Fallback to chrome.* if polyfill is not available
    try {
      // @ts-expect-error
      if (globalThis.chrome?.storage?.local) {
        // @ts-expect-error
        globalThis.chrome.storage.local.get(
          [STORAGE_KEYS.theme],
          (d: Record<string, string | undefined>) => setThemeAttr(d?.[STORAGE_KEYS.theme])
        )
      } else {
        setThemeAttr(undefined)
      }
    } catch {
      setThemeAttr(undefined)
    }
  }
}

void init()
