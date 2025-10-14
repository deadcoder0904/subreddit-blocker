# Subreddit Blocker

Blocks you from visiting specific, time‑consuming subreddits. Simple list‑based blocking with a quick enable/disable toggle.

## Features

- Block list: enter subreddits to block (one per line)
- Toggle: quickly enable/disable blocking from the popup
- Works on `reddit.com` and `old.reddit.com`
- MV3 background service worker (no content scripts needed)
- Friendly blocked page with instructions

## Install (Development)

Requirements:

- Chrome or Chromium with extensions developer mode
- Optional: Deno for formatting tasks

Steps:

- Open `chrome://extensions` and enable Developer mode.
- Click `Load unpacked` and select this folder.
- Click the extension icon to configure settings.

## Usage

- Open the popup (extension icon).
- Add subreddits to block, one per line. Accepted formats:
  - `r/subreddit`, `/r/subreddit`, `reddit.com/r/subreddit`, `old.reddit.com/r/subreddit`
- Leave only the subreddit name per line if you prefer: `askreddit`
- Use the toggle to enable/disable blocking.
- Navigate to any blocked subreddit (e.g., `https://www.reddit.com/r/askreddit/`) and you’ll be redirected to the built‑in `blocked.html` page.

## How It Works

- The background service worker listens to `webNavigation.onCommitted` for top‑level navigations to Reddit.
- If the path matches `/r/<name>` and `<name>` is in your block list, the tab is redirected to `blocked.html`.
- Settings are stored in `chrome.storage.local`:
  - `blockedSubreddits`: string[] of subreddit names (lowercased)
  - `enabled`: boolean toggle

## Permissions

- `storage`: save and load your settings
- `webNavigation`: observe navigations to detect subreddit visits
- `tabs`: update the current tab’s URL to the blocked page
- Host permissions: `*://*.reddit.com/*`, `*://old.reddit.com/*`

## Scripts and Formatting

- Zip for publishing: `npm run zip`
- Format with Deno: `npm run fmt`
- Check formatting: `npm run fmt:check`

## File Overview

- `manifest.json` — MV3 manifest
- `background.js` — service worker logic for blocking
- `popup.html` / `popup.js` — settings UI and storage
- `blocked.html` — redirection target page
- `icons/` — extension icon(s)

## Notes

- Blocking targets subreddit paths (`/r/<name>`). Other Reddit areas (e.g., user profiles) are not affected.
- This is a simple, client‑side blocker intended for personal use.
