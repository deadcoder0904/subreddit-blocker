document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('subreddits')
  const enableToggle = document.getElementById('enableBlocking')
  const saveButton = document.getElementById('save')
  const statusDiv = document.getElementById('status')

  const defaultSubreddits = `old.reddit.com/r/wallstreetbets
reddit.com/r/cryptocurrency
/r/politics
r/antiwork
r/drama
r/relationships`

  // Load saved settings
  chrome.storage.sync.get(['blockedSubreddits', 'isEnabled'], (data) => {
    textarea.value = data.blockedSubreddits || defaultSubreddits
    enableToggle.checked = data.isEnabled !== false // Default to true if undefined
  })

  saveButton.addEventListener('click', () => {
    const subreddits = textarea.value.trim()
    const isEnabled = enableToggle.checked

    chrome.storage.sync.set(
      {
        blockedSubreddits: subreddits,
        isEnabled: isEnabled,
      },
      () => {
        statusDiv.textContent = 'Settings saved!'
        setTimeout(() => {
          statusDiv.textContent = ''
        }, 2000)
      }
    )
  })
})
