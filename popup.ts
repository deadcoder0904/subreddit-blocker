document.addEventListener('DOMContentLoaded', () => {
  const subredditsTextarea = document.getElementById('subreddits') as HTMLTextAreaElement;
  const enableBlockingCheckbox = document.getElementById('enableBlocking') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load settings from storage
  chrome.storage.sync.get(['blockedSubreddits', 'extensionEnabled'], (data) => {
    if (data.blockedSubreddits) {
      subredditsTextarea.value = data.blockedSubreddits.join('\n');
    }
    if (typeof data.extensionEnabled === 'boolean') {
      enableBlockingCheckbox.checked = data.extensionEnabled;
    }
  });

  // Save settings to storage
  saveButton.addEventListener('click', () => {
    const subreddits = subredditsTextarea.value.split('\n').map(s => {
        let subredditName = null;
        const trimmed = s.trim();
        if (trimmed.length > 0) {
            try {
                // Handles full URLs
                const url = new URL(trimmed, 'https://www.reddit.com');
                const match = url.pathname.match(/\/r\/([^\/]+)/);
                if (match) {
                    subredditName = match[1].toLowerCase();
                }
            } catch (e) {
                // Handles formats like "r/subreddit" or "subreddit"
                const match = trimmed.match(/(?:r\/)?(.*)/);
                if (match && match[1]) {
                    subredditName = match[1].split('/')[0].toLowerCase();
                }
            }
        }
        return subredditName ? `r/${subredditName}` : null;
    }).filter((s): s is string => s !== null && s.trim() !== 'r/');

    const uniqueSubreddits = [...new Set(subreddits)];

    const extensionEnabled = enableBlockingCheckbox.checked;

    chrome.storage.sync.set({ blockedSubreddits: uniqueSubreddits, extensionEnabled }, () => {
      statusDiv.textContent = 'Settings Saved!';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });
});
