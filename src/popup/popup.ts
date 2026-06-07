import browser from 'webextension-polyfill'

import { DEFAULTS, STORAGE_KEYS } from '../shared/constants'
import {
  getEffectiveDailyLockUntil,
  getActiveTimeBlock,
  getBlockEndTime,
  formatTime12Hour,
} from '../shared/lock'
import {
  parseSubredditInput,
  formatListForTextarea,
  mergeSubredditLists,
  handleQuickBlockInput,
} from '../shared/utils'
import type { TimeBlock } from '../shared/types'

import { getPopupElements, showStatus, setVisible, scrollBlockedListToEnd } from './dom'
import { setupThemeToggle } from './theme'
import { applyLockState, setupCountdownTimer } from './lock-ui'
import { setupScheduleUI } from './schedule-ui'
import { copySubredditListToClipboard, pasteSubredditListFromClipboard } from './clipboard'

function setActiveTab(
  active: 'blockedList' | 'quickBlock' | 'schedule',
  tabs: {
    blockedListTab: HTMLButtonElement
    quickBlockTab: HTMLButtonElement
    scheduleTab: HTMLButtonElement
    blockedListPanel: HTMLDivElement
    quickBlockPanel: HTMLDivElement
    schedulePanel: HTMLDivElement
  }
) {
  sessionStorage.setItem('activeTab', active)

  tabs.blockedListTab.classList.toggle('popup-tab-active', active === 'blockedList')
  tabs.quickBlockTab.classList.toggle('popup-tab-active', active === 'quickBlock')
  tabs.scheduleTab.classList.toggle('popup-tab-active', active === 'schedule')

  tabs.blockedListTab.setAttribute('aria-selected', String(active === 'blockedList'))
  tabs.quickBlockTab.setAttribute('aria-selected', String(active === 'quickBlock'))
  tabs.scheduleTab.setAttribute('aria-selected', String(active === 'schedule'))

  setVisible(tabs.blockedListPanel, active === 'blockedList')
  setVisible(tabs.quickBlockPanel, active === 'quickBlock')
  setVisible(tabs.schedulePanel, active === 'schedule')
}

async function init() {
  const els = getPopupElements()

  // Load storage
  const data = await browser.storage.local.get([
    STORAGE_KEYS.blockedSubreddits,
    STORAGE_KEYS.extensionEnabled,
    STORAGE_KEYS.theme,
    STORAGE_KEYS.dailyLockUntil,
    STORAGE_KEYS.dailyLockName,
    STORAGE_KEYS.timeBlocks,
  ])

  // Save defaults if missing
  const defaultsToSave: Record<string, unknown> = {}
  for (const key of Object.values(STORAGE_KEYS)) {
    if (typeof data[key] === 'undefined') {
      defaultsToSave[key] = DEFAULTS[key as keyof typeof DEFAULTS]
    }
  }
  if (Object.keys(defaultsToSave).length > 0) {
    await browser.storage.local.set(defaultsToSave)
  }

  // Initialize Block List
  let list =
    (data[STORAGE_KEYS.blockedSubreddits] as string[] | undefined) ?? DEFAULTS.blockedSubreddits
  const syncBlockedList = (nextList: string[]) => {
    list = nextList
    els.subredditsTextarea.value = formatListForTextarea(list)
    scrollBlockedListToEnd(els.subredditsTextarea)
  }
  if (list.length > 0) syncBlockedList(list)

  // Initialize Blocking checkbox
  els.enableBlockingCheckbox.checked =
    typeof data[STORAGE_KEYS.extensionEnabled] === 'boolean'
      ? Boolean(data[STORAGE_KEYS.extensionEnabled])
      : DEFAULTS.extensionEnabled

  // Initialize theme setup
  const currentTheme = (data[STORAGE_KEYS.theme] as 'light' | 'dark' | undefined) ?? DEFAULTS.theme
  setupThemeToggle(
    els.themeToggle,
    els.themeLabel,
    els.iconSun,
    els.iconMoon,
    currentTheme,
    async (next) => {
      await browser.storage.local.set({ [STORAGE_KEYS.theme]: next })
    }
  )

  // Initialize Schedules & Locking
  const timeBlocks =
    (data[STORAGE_KEYS.timeBlocks] as TimeBlock[] | undefined) ?? DEFAULTS.timeBlocks
  const storedLockUntil =
    (data[STORAGE_KEYS.dailyLockUntil] as number | undefined) ?? DEFAULTS.dailyLockUntil
  const lockUntil = getEffectiveDailyLockUntil(storedLockUntil)
  const dailyLockName =
    lockUntil === 0
      ? ''
      : ((data[STORAGE_KEYS.dailyLockName] as string | undefined) ?? DEFAULTS.dailyLockName)
  if (lockUntil !== storedLockUntil) {
    await browser.storage.local.set({
      [STORAGE_KEYS.dailyLockUntil]: lockUntil,
      [STORAGE_KEYS.dailyLockName]: dailyLockName,
    })
  }

  const activeTimeBlock = getActiveTimeBlock(timeBlocks)
  const isLockedBySchedule = activeTimeBlock !== null
  const locked = Date.now() < lockUntil || isLockedBySchedule

  // Setup tabs
  const tabSet = {
    blockedListTab: els.blockedListTab,
    quickBlockTab: els.quickBlockTab,
    scheduleTab: els.scheduleTab,
    blockedListPanel: els.blockedListPanel,
    quickBlockPanel: els.quickBlockPanel,
    schedulePanel: els.schedulePanel,
  }

  const savedActiveTab = sessionStorage.getItem('activeTab') as
    | 'blockedList'
    | 'quickBlock'
    | 'schedule'
    | null
  if (savedActiveTab) {
    setActiveTab(savedActiveTab, tabSet)
  } else {
    setActiveTab(locked ? 'quickBlock' : 'blockedList', tabSet)
  }

  els.blockedListTab.addEventListener('click', () => setActiveTab('blockedList', tabSet))
  els.quickBlockTab.addEventListener('click', () => setActiveTab('quickBlock', tabSet))
  els.scheduleTab.addEventListener('click', () => setActiveTab('schedule', tabSet))

  // Enforce lock UI state
  const onLockClick = async (block: TimeBlock) => {
    const endTime = getBlockEndTime(block)
    const timeDiffMs = endTime - Date.now()
    const totalMinutes = Math.ceil(timeDiffMs / (60 * 1000))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const durationParts = []
    if (hours > 0) {
      durationParts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
    }
    if (minutes > 0) {
      durationParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)
    }
    const durationStr = durationParts.join(' and ') || 'less than a minute'

    const message = `Are you sure you want to block ${block.name} early? This will lock editing immediately for ${durationStr} (until ${formatTime12Hour(block.endTime)}).`
    if (!confirm(message)) return

    els.enableBlockingCheckbox.checked = true
    await browser.storage.local.set({
      [STORAGE_KEYS.dailyLockUntil]: endTime,
      [STORAGE_KEYS.dailyLockName]: block.name,
      [STORAGE_KEYS.extensionEnabled]: true,
    })
    window.location.reload()
  }

  applyLockState(
    locked,
    [els.saveButton, els.toggleContainer, els.subredditsTextarea],
    els.lockButtonsContainer,
    els.statusDiv,
    els.subredditsTextarea,
    isLockedBySchedule,
    timeBlocks,
    dailyLockName,
    onLockClick
  )
  setVisible(els.lockedEditNotice, locked)

  if (locked) {
    if (isLockedBySchedule && activeTimeBlock) {
      const lockedNoticeText = `Locked by schedule: ${activeTimeBlock.name}`
      els.lockedEditNotice.title = lockedNoticeText
      els.lockedEditNotice.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" class="size-3.5 shrink-0 text-accent"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>
        <span class="truncate whitespace-nowrap">${lockedNoticeText}</span>
      `
    } else {
      const lockNameDisplay = dailyLockName || 'today'
      const lockedNoticeText = `Locked for ${lockNameDisplay}`
      els.lockedEditNotice.title = lockedNoticeText
      els.lockedEditNotice.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" class="size-3.5 shrink-0 text-accent"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>
        <span class="truncate whitespace-nowrap">${lockedNoticeText}</span>
      `
    }
    setupCountdownTimer(
      els.lockButtonsContainer,
      lockUntil,
      timeBlocks,
      isLockedBySchedule,
      dailyLockName
    )
  }

  // Setup Schedule UI
  setupScheduleUI(
    {
      addBlockBtn: els.addBlockBtn,
      blocksList: els.blocksList,
      blockForm: els.blockForm,
      formTitle: els.formTitle,
      blockIdInput: els.blockIdInput,
      blockNameInput: els.blockNameInput,
      blockStartInput: els.blockStartInput,
      blockEndInput: els.blockEndInput,
      saveBlockBtn: els.saveBlockBtn,
      cancelBlockBtn: els.cancelBlockBtn,
      dayButtons: els.dayButtons,
      enableBlockingCheckbox: els.enableBlockingCheckbox,
    },
    timeBlocks,
    locked
  )

  // Quick Block Chip Buttons support
  document.querySelectorAll<HTMLButtonElement>('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      els.quickBlockInput.value = chip.dataset.prefix ?? ''
      els.quickBlockInput.focus()
      els.quickBlockInput.setSelectionRange(
        els.quickBlockInput.value.length,
        els.quickBlockInput.value.length
      )
    })
  })

  const addQuickBlock = async () => {
    const currentList = parseSubredditInput(els.subredditsTextarea.value)
    const result = handleQuickBlockInput(els.quickBlockInput.value, currentList)

    if (result.isError) {
      els.quickBlockStatus.classList.add('text-accent')
      showStatus(els.quickBlockStatus, result.message, 3000)
      setTimeout(() => {
        els.quickBlockStatus.classList.remove('text-accent')
      }, 3000)
      return
    }

    if (result.success && result.nextList) {
      await browser.storage.local.set({
        [STORAGE_KEYS.blockedSubreddits]: result.nextList,
        [STORAGE_KEYS.extensionEnabled]: true,
      })
      els.enableBlockingCheckbox.checked = true
      syncBlockedList(result.nextList)
      els.quickBlockInput.value = ''

      showStatus(els.quickBlockStatus, result.message)
      showStatus(els.statusDiv, result.message)
    }
  }
  els.quickBlockAdd.addEventListener('click', addQuickBlock)
  els.quickBlockInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void addQuickBlock()
    }
  })

  els.copySubredditsButton.addEventListener('click', async () => {
    const result = await copySubredditListToClipboard({
      textareaValue: els.subredditsTextarea.value,
      clipboard: navigator.clipboard,
    })
    showStatus(els.statusDiv, result.message)
  })

  els.pasteSubredditsButton.addEventListener('click', async () => {
    const result = await pasteSubredditListFromClipboard({
      clipboard: navigator.clipboard,
      save: async (nextStorage) => {
        await browser.storage.local.set(nextStorage)
      },
    })

    if (result.success) {
      syncBlockedList(result.subreddits)
    }

    showStatus(els.statusDiv, result.message)
  })

  // Blocked List Save
  els.saveButton.addEventListener('click', async () => {
    if (locked) return
    const userList = parseSubredditInput(els.subredditsTextarea.value)
    const uniqueSubreddits = mergeSubredditLists(userList)
    await browser.storage.local.set({
      [STORAGE_KEYS.blockedSubreddits]: uniqueSubreddits,
      [STORAGE_KEYS.extensionEnabled]: els.enableBlockingCheckbox.checked,
    })
    syncBlockedList(uniqueSubreddits)
    showStatus(els.statusDiv, 'Settings Saved!')
  })

  // Listen to storage changes to dynamically refresh footer buttons instantly
  browser.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEYS.timeBlocks]) {
      const nextTimeBlocks =
        (changes[STORAGE_KEYS.timeBlocks].newValue as TimeBlock[] | undefined) ?? []
      applyLockState(
        locked,
        [els.saveButton, els.toggleContainer, els.subredditsTextarea],
        els.lockButtonsContainer,
        els.statusDiv,
        els.subredditsTextarea,
        isLockedBySchedule,
        nextTimeBlocks,
        dailyLockName,
        onLockClick
      )
    }
  })

  // Dynamic lock buttons are handled within applyLockState
}

document.addEventListener('DOMContentLoaded', init)
