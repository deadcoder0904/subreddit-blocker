import { STORAGE_KEYS } from '../shared/constants'
import {
  formatListForTextarea,
  formatSubredditClipboardText,
  parseSubredditClipboardText,
} from '../shared/utils'

interface ClipboardWriter {
  writeText(text: string): Promise<void>
}

interface ClipboardReader {
  readText(): Promise<string>
}

export async function copySubredditListToClipboard(options: {
  textareaValue: string
  clipboard: ClipboardWriter
}): Promise<{ success: boolean; message: string }> {
  const clipboardText = formatSubredditClipboardText(options.textareaValue.split(/\r?\n/))

  try {
    await options.clipboard.writeText(clipboardText)
    return { success: true, message: 'Copied subreddit list.' }
  } catch {
    return { success: false, message: 'Clipboard unavailable.' }
  }
}

export async function pasteSubredditListFromClipboard(options: {
  clipboard: ClipboardReader
  save(data: Record<string, unknown>): Promise<void>
}): Promise<
  | {
      success: true
      message: string
      textareaValue: string
      subreddits: string[]
    }
  | { success: false; message: string }
> {
  let clipboardText = ''
  try {
    clipboardText = await options.clipboard.readText()
  } catch {
    return { success: false, message: 'Clipboard unavailable.' }
  }

  const result = parseSubredditClipboardText(clipboardText)
  if (!result.success) return result

  await options.save({ [STORAGE_KEYS.blockedSubreddits]: result.subreddits })

  return {
    success: true,
    message: 'Imported subreddit list.',
    textareaValue: formatListForTextarea(result.subreddits),
    subreddits: result.subreddits,
  }
}
