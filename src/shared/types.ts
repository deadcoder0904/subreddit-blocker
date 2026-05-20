export interface TimeBlock {
  id: string
  name: string
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  days: number[] // 0-6 (0 = Sunday, 6 = Saturday)
  enabled: boolean
}

export interface StorageData {
  blockedSubreddits: string[]
  extensionEnabled: boolean
  theme?: 'light' | 'dark'
  dailyLockUntil?: number
  timeBlocks?: TimeBlock[]
}

export interface SubredditMatch {
  subreddit: string
  isBlocked: boolean
}
