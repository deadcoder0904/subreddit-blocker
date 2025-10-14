export interface StorageData {
  blockedSubreddits: string[]
  extensionEnabled: boolean
  theme?: 'light' | 'dark'
  dailyLockUntil?: number
}

export interface SubredditMatch {
  subreddit: string
  isBlocked: boolean
}
