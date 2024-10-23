function normalizeSubredditUrl(url) {
  // Remove leading/trailing spaces and convert to lowercase
  url = url.trim().toLowerCase()

  // Handle different URL formats
  if (url.startsWith('r/')) {
    url = '/' + url
  }
  if (url.startsWith('/r/')) {
    return url.split('?')[0] // Remove query parameters
  }

  // Handle full URLs
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname.split('?')[0] // Remove query parameters
    if (path.startsWith('/r/')) {
      return path
    }
  } catch (e) {
    // Invalid URL format, ignore
  }
  return url
}

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    const { isEnabled, blockedSubreddits } = await chrome.storage.sync.get([
      'isEnabled',
      'blockedSubreddits',
    ])

    // If blocking is disabled or no subreddits are specified, do nothing
    if (!isEnabled || !blockedSubreddits) {
      return
    }

    const url = details.url.toLowerCase()
    const blockedList = blockedSubreddits
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s) // Remove empty lines
      .map(normalizeSubredditUrl)

    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname.toLowerCase()

      // Check if the current URL matches any blocked subreddit
      for (const blockedSub of blockedList) {
        const normalizedBlockedSub = normalizeSubredditUrl(blockedSub)
        if (path.startsWith(normalizedBlockedSub)) {
          // Block the navigation
          chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL('blocked.html'),
          })
          return
        }
      }
    } catch (e) {
      console.error('Error processing URL:', e)
    }
  },
  {
    url: [{ hostSuffix: 'reddit.com' }, { hostSuffix: 'old.reddit.com' }],
  }
)
