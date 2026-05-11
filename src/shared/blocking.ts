import type { StorageData } from './types'
import { extractSubreddit, isSupportedHostUrl } from './utils'

export function shouldBlockUrl(settings: StorageData, url: string): boolean {
  if (!settings.extensionEnabled || !settings.blockedSubreddits?.length) return false
  if (!isSupportedHostUrl(url)) return false

  const subreddit = extractSubreddit(url)
  if (!subreddit) return false

  return settings.blockedSubreddits.includes(subreddit)
}
