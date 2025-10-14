import browser from 'webextension-polyfill'

import { DEFAULTS, STORAGE_KEYS, THEMES } from '../shared/constants'
import { parseSubredditInput } from '../shared/utils'

function qs<T extends Element = Element>(sel: string): T {
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
  const lockButton = qs<HTMLButtonElement>('#lockToday')
  const toggleContainer = qs<HTMLLabelElement>('#toggleContainer')

  const data = await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.theme,
    STORAGE_KEYS.dailyLockUntil,
  ])
  if (data[STORAGE_KEYS.blockedSubreddits]) {
    // Display with '/r/' prefix in the input
    const lines = (data[STORAGE_KEYS.blockedSubreddits] as string[]).map((s) =>
      s.startsWith('/r/') ? s : s.startsWith('r/') ? `/${s}` : s
    )
    subredditsTextarea.value = lines.join('\n')
  }
  if (typeof data[STORAGE_KEYS.extensionEnabled] === 'boolean') {
    enableBlockingCheckbox.checked = Boolean(data[STORAGE_KEYS.extensionEnabled])
  }

  // Theme init
  const currentTheme = (data[STORAGE_KEYS.theme] as 'light' | 'dark' | undefined) ?? DEFAULTS.theme
  applyTheme(currentTheme)

  // Lock state init
  const lockUntil = (data[STORAGE_KEYS.dailyLockUntil] as number | undefined) ?? 0
  applyLockState(Boolean(lockUntil && Date.now() < lockUntil))

  saveButton.addEventListener('click', async () => {
    const userList = parseSubredditInput(subredditsTextarea.value) // returns "/r/..."
    const uniqueSubreddits = [...new Set(userList)] // store "/r/..." exactly as parsed
    const extensionEnabled = enableBlockingCheckbox.checked
    await browser.storage.local.set({
      [STORAGE_KEYS.blockedSubreddits]: uniqueSubreddits,
      [STORAGE_KEYS.extensionEnabled]: extensionEnabled,
    })
    statusDiv.textContent = 'Settings Saved!'
    setTimeout(() => {
      statusDiv.textContent = ''
    }, 2000)
  })

  themeToggle.addEventListener('click', async () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    applyTheme(next as 'light' | 'dark')
    await browser.storage.local.set({ [STORAGE_KEYS.theme]: next })
  })

  lockButton.addEventListener('click', async () => {
    const now = new Date()
    const until = new Date(now)
    until.setHours(23, 59, 59, 999)
    await browser.storage.local.set({ [STORAGE_KEYS.dailyLockUntil]: until.getTime() })
    applyLockState(true)
    // Keep status line for Save messages only
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

  function applyLockState(locked: boolean) {
    // Save, toggle, textarea become non-interactive
    const controls: Array<HTMLElement> = [saveButton, toggleContainer, subredditsTextarea]
    controls.forEach((el) => {
      if (locked) {
        el.style.pointerEvents = 'none'
        el.setAttribute('aria-disabled', 'true')
        el.setAttribute('tabindex', '-1')
        el.classList.add('opacity-60', 'cursor-not-allowed')
        if (el === subredditsTextarea) {
          ;(el as HTMLTextAreaElement).readOnly = true
          ;(el as HTMLTextAreaElement).blur()
        }
      } else {
        el.style.pointerEvents = ''
        el.removeAttribute('aria-disabled')
        el.removeAttribute('tabindex')
        el.classList.remove('opacity-60', 'cursor-not-allowed')
        if (el === subredditsTextarea) {
          ;(el as HTMLTextAreaElement).readOnly = false
        }
      }
    })
    // Update lock button appearance/content in place
    if (locked) {
      lockButton.style.pointerEvents = 'none'
      lockButton.setAttribute('aria-disabled', 'true')
      lockButton.setAttribute('tabindex', '-1')
      lockButton.className =
        'flex-1 py-2.5 text-(--color-accent) font-semibold rounded-md text-[13px] inline-flex items-center justify-center gap-1'
      lockButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" class="size-4"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg> Locked for today'
    } else {
      lockButton.style.pointerEvents = ''
      lockButton.removeAttribute('aria-disabled')
      lockButton.removeAttribute('tabindex')
      lockButton.className =
        'flex-1 py-2.5 bg-(--color-panel) text-(--color-text) font-semibold rounded-md border border-(--color-border) hover:bg-(--color-panel-2) text-[13px] inline-flex items-center justify-center gap-1'
      lockButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" class="size-4"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg> Block for today'
      statusDiv.textContent = ''
    }
  }
})
