import { setInteractivity } from './dom'
import {
  getActiveTimeBlock,
  getActiveTimeBlockRemainingMs,
  getBlockEndTime,
  formatTime12Hour,
} from '../shared/lock'
import type { TimeBlock } from '../shared/types'

const LOCK_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" class="size-4"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>`

export function applyLockState(
  locked: boolean,
  controls: Array<HTMLElement>,
  container: HTMLDivElement,
  statusDiv: HTMLDivElement,
  subredditsTextarea: HTMLTextAreaElement,
  isLockedBySchedule: boolean,
  timeBlocks: TimeBlock[],
  dailyLockName: string,
  onLock: (block: TimeBlock) => void
): void {
  controls.forEach((el) => {
    if (el === subredditsTextarea) {
      subredditsTextarea.readOnly = locked
      subredditsTextarea.classList.toggle('opacity-80', locked)
      if (locked) subredditsTextarea.blur()
      return
    }
    setInteractivity(el, !locked)
  })

  container.innerHTML = ''

  if (locked) {
    const lockButton = document.createElement('button')
    lockButton.style.pointerEvents = 'none'
    lockButton.setAttribute('aria-disabled', 'true')
    lockButton.setAttribute('tabindex', '-1')
    lockButton.className =
      'flex-1 py-2.5 text-(--color-accent) font-semibold rounded-md text-[13px] inline-flex items-center justify-center gap-1 w-full'

    const labelText = isLockedBySchedule
      ? 'Locked by schedule'
      : dailyLockName
        ? `Locked for ${dailyLockName}`
        : 'Locked for today'
    lockButton.innerHTML = `${LOCK_ICON_SVG} ${labelText}`
    container.appendChild(lockButton)
  } else {
    statusDiv.textContent = ''

    const now = new Date()
    const enabledBlocks = timeBlocks.filter(
      (b) => b.enabled && getBlockEndTime(b, now) > now.getTime()
    )

    if (enabledBlocks.length === 0) {
      const btn = document.createElement('button')
      btn.disabled = true
      btn.setAttribute('aria-disabled', 'true')
      btn.setAttribute('tabindex', '-1')
      btn.className =
        'flex-1 py-2.5 bg-(--color-panel) text-(--color-text) font-semibold rounded-md border border-(--color-border) text-[13px] inline-flex items-center justify-center gap-1 w-full opacity-50 cursor-not-allowed'
      btn.innerHTML = `${LOCK_ICON_SVG} Block for today`
      container.appendChild(btn)
    } else {
      enabledBlocks.forEach((block) => {
        const btn = document.createElement('button')
        btn.className =
          'flex-1 py-2.5 bg-(--color-panel) text-(--color-text) font-semibold rounded-md border border-(--color-border) hover:bg-(--color-panel-2) text-[13px] inline-flex items-center justify-center gap-1 w-full cursor-pointer transition-all duration-150'
        btn.innerHTML = `${LOCK_ICON_SVG} Block ${block.name} (until ${formatTime12Hour(block.endTime)})`
        btn.setAttribute(
          'title',
          `Locks editing immediately until ${formatTime12Hour(block.endTime)}`
        )
        btn.addEventListener('click', () => {
          onLock(block)
        })
        container.appendChild(btn)
      })
    }
  }
}

export function updateCountdown(
  container: HTMLDivElement,
  lockUntil: number,
  timeBlocks: TimeBlock[],
  isLockedBySchedule: boolean,
  dailyLockName: string
): void {
  const now = new Date()
  let remainingMs = 0

  if (isLockedBySchedule) {
    const activeBlock = getActiveTimeBlock(timeBlocks, now)
    if (activeBlock) {
      remainingMs = getActiveTimeBlockRemainingMs(activeBlock, now)
    }
  } else {
    remainingMs = lockUntil - now.getTime()
  }

  if (remainingMs <= 0) {
    window.location.reload()
    return
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const timeString = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':')

  const labelText = isLockedBySchedule
    ? 'Locked by schedule'
    : dailyLockName
      ? `Locked for ${dailyLockName}`
      : 'Locked for today'

  const btn = container.querySelector('button')
  if (btn) {
    btn.innerHTML = `${LOCK_ICON_SVG} ${labelText}: ${timeString}`
  }
}

export function setupCountdownTimer(
  container: HTMLDivElement,
  lockUntil: number,
  timeBlocks: TimeBlock[],
  isLockedBySchedule: boolean,
  dailyLockName: string
): void {
  updateCountdown(container, lockUntil, timeBlocks, isLockedBySchedule, dailyLockName)
  setInterval(() => {
    updateCountdown(container, lockUntil, timeBlocks, isLockedBySchedule, dailyLockName)
  }, 1000)
}
