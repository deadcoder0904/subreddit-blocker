import browser from 'webextension-polyfill'

function setThemeAttr(theme?: string) {
  const t = theme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  document.body.setAttribute('data-theme', t)
}

async function init() {
  try {
    const data = await browser.storage.local.get('theme')
    setThemeAttr(data?.theme as string | undefined)
  } catch {
    // Fallback to chrome.* if polyfill is not available
    try {
      // @ts-ignore
      if (globalThis.chrome?.storage?.local) {
        // @ts-ignore
        globalThis.chrome.storage.local.get(['theme'], (d: { theme?: string }) => setThemeAttr(d?.theme))
      } else {
        setThemeAttr(undefined)
      }
    } catch {
      setThemeAttr(undefined)
    }
  }
}

init()

