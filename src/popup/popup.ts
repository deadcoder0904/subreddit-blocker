import browser from 'webextension-polyfill'

import { DEFAULTS, STORAGE_KEYS, THEMES } from '../shared/constants'
import { getEffectiveDailyLockUntil, getLockTodayStorageUpdate } from '../shared/lock'
import { parseSubredditInput } from '../shared/utils'

function qs<T extends Element = Element>(sel: string): T {
  const el = document.querySelector(sel)
  if (!el) throw new Error(`Missing element: ${sel}`)
  return el as T
}

function showStatus(el: HTMLElement, text: string, ms = 2000) {
  el.textContent = text
  if (ms > 0)
    setTimeout(() => {
      el.textContent = ''
    }, ms)
}

function setVisible(el: HTMLElement, visible: boolean) {
  el.classList.toggle('hidden', !visible)
}

function setInteractivity(el: HTMLElement, interactive: boolean) {
  if (interactive) {
    el.style.pointerEvents = ''
    el.removeAttribute('aria-disabled')
    el.removeAttribute('tabindex')
    el.classList.remove('opacity-60', 'cursor-not-allowed')
  } else {
    el.style.pointerEvents = 'none'
    el.setAttribute('aria-disabled', 'true')
    el.setAttribute('tabindex', '-1')
    el.classList.add('opacity-60', 'cursor-not-allowed')
  }
}

function setActiveTab(
  active: 'blockedList' | 'quickBlock',
  tabs: {
    blockedListTab: HTMLButtonElement
    quickBlockTab: HTMLButtonElement
    blockedListPanel: HTMLDivElement
    quickBlockPanel: HTMLDivElement
  }
) {
  const blockedActive = active === 'blockedList'
  tabs.blockedListTab.classList.toggle('popup-tab-active', blockedActive)
  tabs.quickBlockTab.classList.toggle('popup-tab-active', !blockedActive)
  tabs.blockedListTab.setAttribute('aria-selected', String(blockedActive))
  tabs.quickBlockTab.setAttribute('aria-selected', String(!blockedActive))
  setVisible(tabs.blockedListPanel, blockedActive)
  setVisible(tabs.quickBlockPanel, !blockedActive)
}

function applyTheme(
  theme: 'light' | 'dark',
  labelEl: HTMLElement,
  sunIcon: Element,
  moonIcon: Element
) {
  if (!THEMES.includes(theme)) theme = DEFAULTS.theme
  document.body.setAttribute('data-theme', theme)
  labelEl.textContent = theme === 'dark' ? 'Dark' : 'Light'
  if (theme === 'dark') {
    sunIcon.classList.remove('hidden')
    moonIcon.classList.add('hidden')
  } else {
    sunIcon.classList.add('hidden')
    moonIcon.classList.remove('hidden')
  }
}

function applyLockState(
  locked: boolean,
  controls: Array<HTMLElement>,
  lockButton: HTMLButtonElement,
  statusDiv: HTMLDivElement,
  subredditsTextarea: HTMLTextAreaElement
) {
  controls.forEach((el) => {
    if (el === subredditsTextarea) {
      subredditsTextarea.readOnly = locked
      subredditsTextarea.classList.toggle('opacity-80', locked)
      if (locked) subredditsTextarea.blur()
      return
    }

    setInteractivity(el, !locked)
  })

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

function formatListForTextarea(list: string[]): string {
  return list.map((s) => (s.startsWith('/r/') ? s : s.startsWith('r/') ? `/${s}` : s)).join('\n')
}

function mergeSubredditLists(...lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}

async function init() {
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
  const blockedListTab = qs<HTMLButtonElement>('#blockedListTab')
  const quickBlockTab = qs<HTMLButtonElement>('#quickBlockTab')
  const blockedListPanel = qs<HTMLDivElement>('#blockedListPanel')
  const quickBlockPanel = qs<HTMLDivElement>('#quickBlockPanel')
  const lockedEditNotice = qs<HTMLDivElement>('#lockedEditNotice')
  const quickBlockInput = qs<HTMLInputElement>('#quickBlockInput')
  const quickBlockAdd = qs<HTMLButtonElement>('#quickBlockAdd')
  const quickBlockStatus = qs<HTMLDivElement>('#quickBlockStatus')
  const tabs = { blockedListTab, quickBlockTab, blockedListPanel, quickBlockPanel }

  const data = await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.theme,
    STORAGE_KEYS.dailyLockUntil,
  ])

  let list = (data[STORAGE_KEYS.blockedSubreddits] as string[] | undefined) ?? []
  const syncBlockedList = (nextList: string[]) => {
    list = nextList
    subredditsTextarea.value = formatListForTextarea(list)
  }

  if (list.length) syncBlockedList(list)

  if (typeof data[STORAGE_KEYS.extensionEnabled] === 'boolean') {
    enableBlockingCheckbox.checked = Boolean(data[STORAGE_KEYS.extensionEnabled])
  }

  const currentTheme = (data[STORAGE_KEYS.theme] as 'light' | 'dark' | undefined) ?? DEFAULTS.theme
  applyTheme(currentTheme, themeLabel, iconSun, iconMoon)

  const storedLockUntil = (data[STORAGE_KEYS.dailyLockUntil] as number | undefined) ?? 0
  const lockUntil = getEffectiveDailyLockUntil(storedLockUntil)
  if (lockUntil !== storedLockUntil) {
    await browser.storage.local.set({ [STORAGE_KEYS.dailyLockUntil]: lockUntil })
  }
  const locked = Date.now() < lockUntil
  applyLockState(
    locked,
    [saveButton, toggleContainer, subredditsTextarea],
    lockButton,
    statusDiv,
    subredditsTextarea
  )
  setVisible(lockedEditNotice, locked)
  if (locked) setActiveTab('quickBlock', tabs)

  blockedListTab.addEventListener('click', () => setActiveTab('blockedList', tabs))
  quickBlockTab.addEventListener('click', () => setActiveTab('quickBlock', tabs))

  document.querySelectorAll<HTMLButtonElement>('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      quickBlockInput.value = chip.dataset.prefix ?? ''
      quickBlockInput.focus()
      quickBlockInput.setSelectionRange(quickBlockInput.value.length, quickBlockInput.value.length)
    })
  })

  const addQuickBlock = async () => {
    const additions = parseSubredditInput(quickBlockInput.value)
    if (!additions.length) {
      showStatus(quickBlockStatus, 'Enter a subreddit or supported URL.')
      return
    }

    const currentList = parseSubredditInput(subredditsTextarea.value)
    const nextList = mergeSubredditLists(currentList, additions)
    await browser.storage.local.set({
      [STORAGE_KEYS.blockedSubreddits]: nextList,
      [STORAGE_KEYS.extensionEnabled]: true,
    })
    enableBlockingCheckbox.checked = true
    syncBlockedList(nextList)
    quickBlockInput.value = ''
    showStatus(quickBlockStatus, additions.length === 1 ? 'Blocked.' : 'Blocked all additions.')
  }

  saveButton.addEventListener('click', async () => {
    const userList = parseSubredditInput(subredditsTextarea.value)
    const uniqueSubreddits = mergeSubredditLists(userList)
    await browser.storage.local.set({
      [STORAGE_KEYS.blockedSubreddits]: uniqueSubreddits,
      [STORAGE_KEYS.extensionEnabled]: enableBlockingCheckbox.checked,
    })
    syncBlockedList(uniqueSubreddits)
    showStatus(statusDiv, 'Settings Saved!')
  })

  quickBlockAdd.addEventListener('click', addQuickBlock)
  quickBlockInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void addQuickBlock()
    }
  })

  themeToggle.addEventListener('click', async () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    applyTheme(next as 'light' | 'dark', themeLabel, iconSun, iconMoon)
    await browser.storage.local.set({ [STORAGE_KEYS.theme]: next })
  })

  lockButton.addEventListener('click', async () => {
    enableBlockingCheckbox.checked = true
    await browser.storage.local.set(getLockTodayStorageUpdate())
    applyLockState(
      true,
      [saveButton, toggleContainer, subredditsTextarea],
      lockButton,
      statusDiv,
      subredditsTextarea
    )
    setVisible(lockedEditNotice, true)
    setActiveTab('quickBlock', tabs)
    showStatus(quickBlockStatus, 'Edits locked except adding.', 3000)
  })
}

document.addEventListener('DOMContentLoaded', init)
