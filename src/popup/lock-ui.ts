import { setInteractivity } from './dom'
import { getActiveTimeBlock, getActiveTimeBlockRemainingMs } from '../shared/lock'
import type { TimeBlock } from '../shared/types'

const LOCK_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" class="size-4"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>`

export function applyLockState(
  locked: boolean,
  controls: Array<HTMLElement>,
  lockButton: HTMLButtonElement,
  statusDiv: HTMLDivElement,
  subredditsTextarea: HTMLTextAreaElement,
  isLockedBySchedule: boolean
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

  if (locked) {
    lockButton.style.pointerEvents = 'none'
    lockButton.setAttribute('aria-disabled', 'true')
    lockButton.setAttribute('tabindex', '-1')
    lockButton.className =
      'flex-1 py-2.5 text-(--color-accent) font-semibold rounded-md text-[13px] inline-flex items-center justify-center gap-1'

    const labelText = isLockedBySchedule ? 'Locked by schedule' : 'Locked for today'
    lockButton.innerHTML = `${LOCK_ICON_SVG} ${labelText}`
  } else {
    lockButton.style.pointerEvents = ''
    lockButton.removeAttribute('aria-disabled')
    lockButton.removeAttribute('tabindex')
    lockButton.className =
      'flex-1 py-2.5 bg-(--color-panel) text-(--color-text) font-semibold rounded-md border border-(--color-border) hover:bg-(--color-panel-2) text-[13px] inline-flex items-center justify-center gap-1'
    lockButton.innerHTML = `${LOCK_ICON_SVG} Block for today`
    statusDiv.textContent = ''
  }
}

export function updateCountdown(
  lockButton: HTMLButtonElement,
  lockUntil: number,
  timeBlocks: TimeBlock[],
  isLockedBySchedule: boolean
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

  lockButton.innerHTML = `${LOCK_ICON_SVG} ${timeString}`
}

export function setupCountdownTimer(
  lockButton: HTMLButtonElement,
  lockUntil: number,
  timeBlocks: TimeBlock[],
  isLockedBySchedule: boolean
): void {
  updateCountdown(lockButton, lockUntil, timeBlocks, isLockedBySchedule)
  setInterval(() => {
    updateCountdown(lockButton, lockUntil, timeBlocks, isLockedBySchedule)
  }, 1000)
}
