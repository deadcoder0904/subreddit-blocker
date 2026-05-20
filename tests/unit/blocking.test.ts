import { describe, expect, it } from 'bun:test'
import { shouldBlockUrl } from '../../src/shared/blocking'
import type { StorageData, TimeBlock } from '../../src/shared/types'

function settings(overrides: Partial<StorageData> = {}): StorageData {
  return {
    blockedSubreddits: ['/r/funny'],
    extensionEnabled: true,
    dailyLockUntil: Date.now() + 60_000,
    ...overrides,
  }
}

describe('blocking decisions', () => {
  it('blocks matching subreddits on supported hosts', () => {
    expect(shouldBlockUrl(settings(), 'https://reddit.com/r/funny')).toBeTrue()
    expect(shouldBlockUrl(settings(), 'https://troddit.com/r/funny')).toBeTrue()
    expect(shouldBlockUrl(settings(), 'https://eddrit.com/r/funny')).toBeTrue()
  })

  it('blocks when blocking is disabled but an active lock is present', () => {
    expect(
      shouldBlockUrl(
        settings({
          extensionEnabled: false,
          dailyLockUntil: Date.now() + 60_000,
        }),
        'https://reddit.com/r/funny'
      )
    ).toBeTrue()
  })

  it('does not block unrelated hosts or unlisted subreddits', () => {
    expect(shouldBlockUrl(settings(), 'https://google.com/r/funny')).toBeFalse()
    expect(shouldBlockUrl(settings(), 'https://reddit.com/r/programming')).toBeFalse()
  })

  it('blocks during active scheduled time blocks even if extensionEnabled is false', () => {
    const activeBlock: TimeBlock = {
      id: 'work',
      name: 'Work',
      startTime: '09:00',
      endTime: '17:00',
      days: [1, 2, 3, 4, 5],
      enabled: true,
    }

    const testSettings = settings({
      extensionEnabled: false,
      dailyLockUntil: 0,
      timeBlocks: [activeBlock],
    })

    // Active block time (Monday 10:00)
    const activeTime = new Date(2026, 4, 11, 10, 0)
    expect(shouldBlockUrl(testSettings, 'https://reddit.com/r/funny', activeTime)).toBeTrue()

    // Inactive block time (Monday 08:00)
    const inactiveTime = new Date(2026, 4, 11, 8, 0)
    expect(shouldBlockUrl(testSettings, 'https://reddit.com/r/funny', inactiveTime)).toBeFalse()
  })
})
