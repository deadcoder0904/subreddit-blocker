import { STORAGE_KEYS } from './constants'

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
