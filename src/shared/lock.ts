import { STORAGE_KEYS } from './constants'
import type { TimeBlock } from './types'

export function getEndOfLocalDay(now = new Date()): number {
  const until = new Date(now)
  until.setHours(23, 59, 59, 999)
  return until.getTime()
}

export function getEffectiveDailyLockUntil(storedLockUntil = 0, now = Date.now()): number {
  return storedLockUntil > now ? storedLockUntil : 0
}

export function getLockTodayStorageUpdate(now = Date.now()) {
  return {
    [STORAGE_KEYS.dailyLockUntil]: getEndOfLocalDay(new Date(now)),
    [STORAGE_KEYS.extensionEnabled]: true,
  }
}

export function isTimeBlockActive(block: TimeBlock, now = new Date()): boolean {
  if (!block.enabled) return false

  const day = now.getDay()
  const yesterday = (day + 6) % 7

  const [startH, startM] = block.startTime.split(':').map(Number)
  const [endH, endM] = block.endTime.split(':').map(Number)

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes <= endMinutes) {
    return block.days.includes(day) && currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Spans across midnight (e.g. 22:00 to 02:00)
    const isTodayActive = block.days.includes(day) && currentMinutes >= startMinutes
    const isYesterdayActive = block.days.includes(yesterday) && currentMinutes < endMinutes
    return isTodayActive || isYesterdayActive
  }
}

export function getActiveTimeBlock(blocks: TimeBlock[], now = new Date()): TimeBlock | null {
  for (const block of blocks) {
    if (isTimeBlockActive(block, now)) {
      return block
    }
  }
  return null
}

export function getActiveTimeBlockRemainingMs(block: TimeBlock, now = new Date()): number {
  const [startH, startM] = block.startTime.split(':').map(Number)
  const [endH, endM] = block.endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const targetDate = new Date(now)
  targetDate.setHours(endH, endM, 0, 0)

  if (startMinutes <= endMinutes) {
    // Same day range
    return targetDate.getTime() - now.getTime()
  } else {
    // Overnight range
    if (currentMinutes >= startMinutes) {
      // We are in the first part (before midnight, e.g. 23:00)
      // The block ends tomorrow
      targetDate.setDate(targetDate.getDate() + 1)
    } else {
      // We are in the second part (after midnight, e.g. 01:00)
      // The block ends today (targetDate is already set to today)
    }
    return targetDate.getTime() - now.getTime()
  }
}

export function formatTime12Hour(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)

  const ampm = h >= 12 ? 'pm' : 'am'
  let h12 = h % 12
  if (h12 === 0) h12 = 12

  const mPart = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
  return `${h12}${mPart}${ampm}`
}

export function getBlockEndTime(block: TimeBlock, now = new Date()): number {
  const [startH, startM] = block.startTime.split(':').map(Number)
  const [endH, endM] = block.endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const targetDate = new Date(now)
  targetDate.setHours(endH, endM, 0, 0)

  if (startMinutes <= endMinutes) {
    // Same day range
    return targetDate.getTime()
  } else {
    // Overnight range (e.g. 22:00 to 02:00)
    if (currentMinutes >= startMinutes) {
      // E.g. 23:00 on Monday. Ends Tuesday 02:00.
      targetDate.setDate(targetDate.getDate() + 1)
    } else if (currentMinutes < endMinutes) {
      // E.g. 01:00 on Tuesday. Ends Tuesday 02:00.
      // Already correct (today)
    } else {
      // E.g. 11:00. Not yet started, but manually started. Spans across midnight, so ends tomorrow.
      targetDate.setDate(targetDate.getDate() + 1)
    }
    return targetDate.getTime()
  }
}
