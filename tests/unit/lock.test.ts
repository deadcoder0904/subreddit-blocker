import { describe, expect, it } from 'bun:test'
import {
  getEffectiveDailyLockUntil,
  getEndOfLocalDay,
  getLockTodayStorageUpdate,
  isTimeBlockActive,
  getActiveTimeBlock,
  getActiveTimeBlockRemainingMs,
  formatTime12Hour,
  getBlockEndTime,
} from '../../src/shared/lock'
import type { TimeBlock } from '../../src/shared/types'

const block: TimeBlock = {
  id: '1',
  name: 'Work',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5],
  enabled: true,
}

describe('daily lock helpers', () => {
  it('returns the end of the local day', () => {
    const end = getEndOfLocalDay()
    const d = new Date(end)
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
    expect(d.getSeconds()).toBe(59)
  })

  it('clears missing or expired locks', () => {
    expect(getEffectiveDailyLockUntil()).toBe(0)
    expect(getEffectiveDailyLockUntil(Date.now() - 1000)).toBe(0)
  })

  it('keeps an active stored lock', () => {
    const future = Date.now() + 60_000
    expect(getEffectiveDailyLockUntil(future)).toBe(future)
  })

  it('enables blocking when locking for today', () => {
    const update = getLockTodayStorageUpdate()
    expect(update.extensionEnabled).toBeTrue()
    expect(update.dailyLockUntil).toBeGreaterThan(Date.now())
  })
})

describe('time-block schedule helpers', () => {
  it('returns false if block is disabled', () => {
    const disabledBlock = { ...block, enabled: false }
    expect(isTimeBlockActive(disabledBlock)).toBe(false)
  })

  it('returns false if the current day is not selected', () => {
    const now = new Date(2026, 4, 10, 10, 0) // Sunday, May 10, 2026 at 10:00
    expect(isTimeBlockActive(block, now)).toBe(false)
  })

  it('returns true if day and time are within bounds', () => {
    const now = new Date(2026, 4, 11, 10, 0) // Monday, May 11, 2026 at 10:00
    expect(isTimeBlockActive(block, now)).toBe(true)
  })

  it('returns false if day matches but time is outside bounds', () => {
    const morning = new Date(2026, 4, 11, 8, 30) // Monday 8:30 AM
    const evening = new Date(2026, 4, 11, 17, 30) // Monday 5:30 PM
    expect(isTimeBlockActive(block, morning)).toBe(false)
    expect(isTimeBlockActive(block, evening)).toBe(false)
  })

  it('handles overnight time ranges spanning across midnight', () => {
    const overnightBlock: TimeBlock = {
      id: '2',
      name: 'Night Block',
      startTime: '22:00',
      endTime: '02:00',
      days: [1, 2], // Mon, Tue
      enabled: true,
    }

    // Monday night at 23:00 (active)
    const monNight = new Date(2026, 4, 11, 23, 0)
    expect(isTimeBlockActive(overnightBlock, monNight)).toBe(true)

    // Tuesday early morning at 01:00 (active because Tuesday is in days)
    const tueMorning = new Date(2026, 4, 12, 1, 0)
    expect(isTimeBlockActive(overnightBlock, tueMorning)).toBe(true)

    // Tuesday evening at 18:00 (inactive)
    const tueEvening = new Date(2026, 4, 12, 18, 0)
    expect(isTimeBlockActive(overnightBlock, tueEvening)).toBe(false)
  })

  it('returns the active time block or null', () => {
    const blocks: TimeBlock[] = [
      { ...block, enabled: false },
      { ...block, id: 'active-1', name: 'Active block' },
    ]
    const now = new Date(2026, 4, 11, 10, 0)
    const active = getActiveTimeBlock(blocks, now)
    expect(active).not.toBeNull()
    expect(active?.id).toBe('active-1')

    const inactiveTime = new Date(2026, 4, 11, 8, 0)
    expect(getActiveTimeBlock(blocks, inactiveTime)).toBeNull()
  })

  it('calculates remaining time for active block correctly', () => {
    // 1. Same day block (09:00 - 17:00), now is 10:00. Remaining: 7 hours = 25200000ms
    const now1 = new Date(2026, 4, 11, 10, 0, 0, 0)
    expect(getActiveTimeBlockRemainingMs(block, now1)).toBe(7 * 60 * 60 * 1000)

    // 2. Overnight block (22:00 - 02:00), now is Mon 23:00. Remaining: 3 hours = 10800000ms
    const overnightBlock: TimeBlock = {
      id: '2',
      name: 'Night Block',
      startTime: '22:00',
      endTime: '02:00',
      days: [1, 2],
      enabled: true,
    }
    const now2 = new Date(2026, 4, 11, 23, 0, 0, 0)
    expect(getActiveTimeBlockRemainingMs(overnightBlock, now2)).toBe(3 * 60 * 60 * 1000)

    // 3. Overnight block (22:00 - 02:00), now is Tue 01:00. Remaining: 1 hour = 3600000ms
    const now3 = new Date(2026, 4, 12, 1, 0, 0, 0)
    expect(getActiveTimeBlockRemainingMs(overnightBlock, now3)).toBe(1 * 60 * 60 * 1000)
  })

  it('formats 24-hour time to 12-hour format correctly', () => {
    expect(formatTime12Hour('09:00')).toBe('9am')
    expect(formatTime12Hour('17:00')).toBe('5pm')
    expect(formatTime12Hour('12:00')).toBe('12pm')
    expect(formatTime12Hour('12:30')).toBe('12:30pm')
    expect(formatTime12Hour('00:15')).toBe('12:15am')
    expect(formatTime12Hour('00:00')).toBe('12am')
  })

  describe('getBlockEndTime', () => {
    it('calculates end time for same-day block', () => {
      const sameDayBlock: TimeBlock = {
        id: '1',
        name: 'Work',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        enabled: true,
      }
      const now = new Date(2026, 4, 11, 10, 0, 0, 0) // Mon 10:00
      const endTime = getBlockEndTime(sameDayBlock, now)
      expect(endTime).toBe(new Date(2026, 4, 11, 17, 0, 0, 0).getTime())
    })

    it('calculates end time for overnight block starting today and ending tomorrow', () => {
      const overnightBlock: TimeBlock = {
        id: '2',
        name: 'Night',
        startTime: '22:00',
        endTime: '02:00',
        days: [1, 2],
        enabled: true,
      }
      const now = new Date(2026, 4, 11, 23, 0, 0, 0) // Mon 23:00 (ends Tue 02:00)
      const endTime = getBlockEndTime(overnightBlock, now)
      expect(endTime).toBe(new Date(2026, 4, 12, 2, 0, 0, 0).getTime())
    })

    it('calculates end time for overnight block active after midnight today', () => {
      const overnightBlock: TimeBlock = {
        id: '2',
        name: 'Night',
        startTime: '22:00',
        endTime: '02:00',
        days: [1, 2],
        enabled: true,
      }
      const now = new Date(2026, 4, 12, 1, 0, 0, 0) // Tue 01:00 (ends Tue 02:00)
      const endTime = getBlockEndTime(overnightBlock, now)
      expect(endTime).toBe(new Date(2026, 4, 12, 2, 0, 0, 0).getTime())
    })

    it('calculates end time for overnight block not yet started today (ends tomorrow)', () => {
      const overnightBlock: TimeBlock = {
        id: '2',
        name: 'Night',
        startTime: '22:00',
        endTime: '02:00',
        days: [1, 2],
        enabled: true,
      }
      const now = new Date(2026, 4, 11, 11, 0, 0, 0) // Mon 11:00 (ends Tue 02:00)
      const endTime = getBlockEndTime(overnightBlock, now)
      expect(endTime).toBe(new Date(2026, 4, 12, 2, 0, 0, 0).getTime())
    })
  })
})
