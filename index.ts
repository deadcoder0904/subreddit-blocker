chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.sync.set({ blockedSubreddits: [], extensionEnabled: true, },)
},)

// Function to check a tab and redirect if blocked
function checkTabAndRedirect(tab: chrome.tabs.Tab,) {
	if (tab.url) {
		chrome.storage.sync.get(
			['blockedSubreddits', 'extensionEnabled',],
			(data,) => {
				if (
					data.extensionEnabled &&
					data.blockedSubreddits &&
					data.blockedSubreddits.length > 0
				) {
					const url = new URL(tab.url,)
					if (url.hostname.includes('reddit.com',)) {
						const subredditMatch = url.pathname.match(/\/r\/([^\/]+)/,)
						if (subredditMatch) {
							const subreddit = `r/${subredditMatch[1].toLowerCase()}`;
							if (data.blockedSubreddits.includes(subreddit,)) {
								chrome.tabs.update(tab.id!, {
									url: chrome.runtime.getURL('blocked.html',),
								},)
							}
						}
					}
				}
			},
		)
	}
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab,) => {
	if (changeInfo.url) {
		checkTabAndRedirect(tab,)
	}
},)

// Listen for storage changes and check all tabs when storage changes
chrome.storage.onChanged.addListener(() => {
	chrome.tabs.query(
		{ url: ['*://*.reddit.com/*', '*://reddit.com/*', '*://old.reddit.com/*',], },
		(tabs,) => {
			tabs.forEach((tab,) => {
				checkTabAndRedirect(tab,)
			},)
		},
	)
},)
