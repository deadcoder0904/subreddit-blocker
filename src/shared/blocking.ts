import type { StorageData } from './types'
import { extractSubreddit, isSupportedHostUrl } from './utils'
import { getActiveTimeBlock } from './lock'

export function shouldBlockUrl(settings: StorageData, url: string, now = new Date()): boolean {
  const hasActiveManualLock = (settings.dailyLockUntil ?? 0) > now.getTime()
  const hasActiveTimeBlock = getActiveTimeBlock(settings.timeBlocks ?? [], now) !== null
  const isEnabled = settings.extensionEnabled || hasActiveManualLock || hasActiveTimeBlock

  if (!isEnabled || !settings.blockedSubreddits?.length) return false
  if (!isSupportedHostUrl(url)) return false

  const subreddit = extractSubreddit(url)
  if (!subreddit) return false

  return settings.blockedSubreddits.includes(subreddit)
}
