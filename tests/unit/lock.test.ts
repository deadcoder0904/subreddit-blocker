import { describe, expect, it } from 'bun:test'
import { STORAGE_KEYS } from '../../src/shared/constants'
import {
  getEffectiveDailyLockUntil,
  getEndOfLocalDay,
  getLockTodayStorageUpdate,
} from '../../src/shared/lock'

describe('daily lock helpers', () => {
  it('returns the end of the local day', () => {
    const until = new Date(getEndOfLocalDay(new Date(2026, 4, 11, 8, 30)))

    expect(until.getFullYear()).toBe(2026)
    expect(until.getMonth()).toBe(4)
    expect(until.getDate()).toBe(11)
    expect(until.getHours()).toBe(23)
    expect(until.getMinutes()).toBe(59)
    expect(until.getSeconds()).toBe(59)
    expect(until.getMilliseconds()).toBe(999)
  })

  it('clears missing or expired locks', () => {
    const now = new Date(2026, 4, 11, 8, 30).getTime()

    expect(getEffectiveDailyLockUntil(0, now)).toBe(0)
    expect(getEffectiveDailyLockUntil(now - 1, now)).toBe(0)
  })

  it('keeps an active stored lock', () => {
    const now = new Date(2026, 4, 11, 8, 30).getTime()
    const stored = now + 60_000

    expect(getEffectiveDailyLockUntil(stored, now)).toBe(stored)
  })

  it('enables blocking when locking for today', () => {
    const now = new Date(2026, 4, 11, 8, 30).getTime()

    expect(getLockTodayStorageUpdate(now)).toEqual({
      [STORAGE_KEYS.dailyLockUntil]: getEndOfLocalDay(new Date(now)),
      [STORAGE_KEYS.extensionEnabled]: true,
    })
  })
})
