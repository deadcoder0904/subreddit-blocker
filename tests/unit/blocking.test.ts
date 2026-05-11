import { describe, expect, it } from 'bun:test'
import { shouldBlockUrl } from '../../src/shared/blocking'
import type { StorageData } from '../../src/shared/types'

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

  it('does not block when blocking is disabled, even with an active lock', () => {
    expect(
      shouldBlockUrl(
        settings({
          extensionEnabled: false,
          dailyLockUntil: Date.now() + 60_000,
        }),
        'https://reddit.com/r/funny'
      )
    ).toBeFalse()
  })

  it('does not block unrelated hosts or unlisted subreddits', () => {
    expect(shouldBlockUrl(settings(), 'https://google.com/r/funny')).toBeFalse()
    expect(shouldBlockUrl(settings(), 'https://reddit.com/r/programming')).toBeFalse()
  })
})
