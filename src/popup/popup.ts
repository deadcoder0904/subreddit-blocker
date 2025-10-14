import browser from 'webextension-polyfill'
import { parseSubredditInput } from '../shared/utils'
import { DEFAULTS, STORAGE_KEYS, THEMES } from '../shared/constants'

function qs<T extends HTMLElement = HTMLElement>(sel: string): T {
  const el = document.querySelector(sel)
  if (!el) throw new Error(`Missing element: ${sel}`)
  return el as T
}

document.addEventListener('DOMContentLoaded', async () => {
  const subredditsTextarea = qs<HTMLTextAreaElement>('#subreddits')
  const enableBlockingCheckbox = qs<HTMLInputElement>('#enableBlocking')
  const saveButton = qs<HTMLButtonElement>('#save')
  const statusDiv = qs<HTMLDivElement>('#status')
  const themeToggle = qs<HTMLButtonElement>('#themeToggle')
  const themeLabel = qs<HTMLSpanElement>('#themeLabel')
  const iconSun = qs<SVGElement>('#iconSun')
  const iconMoon = qs<SVGElement>('#iconMoon')

  const data = await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.theme,
  ])
  if (data[STORAGE_KEYS.blockedSubreddits]) {
    // Display with '/r/' prefix in the input
    const lines = (data[STORAGE_KEYS.blockedSubreddits] as string[]).map((s) =>
      s.startsWith('/r/') ? s : s.startsWith('r/') ? `/${s}` : s,
    )
    subredditsTextarea.value = lines.join('\n')
  }
  if (typeof data[STORAGE_KEYS.extensionEnabled] === 'boolean') {
    enableBlockingCheckbox.checked = Boolean(data[STORAGE_KEYS.extensionEnabled])
  }

  // Theme init
  const currentTheme = (data[STORAGE_KEYS.theme] as 'light' | 'dark' | undefined) ?? DEFAULTS.theme
  applyTheme(currentTheme)

  saveButton.addEventListener('click', async () => {
    const uniqueSubreddits = parseSubredditInput(subredditsTextarea.value)
    const extensionEnabled = enableBlockingCheckbox.checked
    await browser.storage.local.set({
      [STORAGE_KEYS.blockedSubreddits]: uniqueSubreddits,
      [STORAGE_KEYS.extensionEnabled]: extensionEnabled,
    })
    statusDiv.textContent = 'Settings Saved!'
    setTimeout(() => (statusDiv.textContent = ''), 2000)
  })

  themeToggle.addEventListener('click', async () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    applyTheme(next as 'light' | 'dark')
    await browser.storage.local.set({ [STORAGE_KEYS.theme]: next })
  })

  function applyTheme(theme: 'light' | 'dark') {
    if (!THEMES.includes(theme)) theme = DEFAULTS.theme
    document.body.setAttribute('data-theme', theme)
    themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light'
    if (theme === 'dark') {
      iconSun.classList.remove('hidden')
      iconMoon.classList.add('hidden')
    } else {
      iconSun.classList.add('hidden')
      iconMoon.classList.remove('hidden')
    }
  }
})
