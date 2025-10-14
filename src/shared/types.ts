export interface StorageData {
  blockedSubreddits: string[]
  extensionEnabled: boolean
  theme?: 'light' | 'dark'
}

export interface SubredditMatch {
  subreddit: string
  isBlocked: boolean
}
