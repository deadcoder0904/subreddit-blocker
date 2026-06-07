import { describe, expect, it } from 'bun:test'
import {
  copySubredditListToClipboard,
  pasteSubredditListFromClipboard,
} from '../../src/popup/clipboard'

describe('popup clipboard helpers', () => {
  it('copies normalized textarea text to the clipboard', async () => {
    let copied = ''

    const result = await copySubredditListToClipboard({
      textareaValue: '/r/Foo\nr/bar\nbaz',
      clipboard: {
        writeText: async (text) => {
          copied = text
        },
      },
    })

    expect(result).toEqual({ success: true, message: 'Copied subreddit list.' })
    expect(copied).toBe('/r/foo\n/r/bar\n/r/baz')
  })

  it('pastes clipboard text, replaces the textarea list, and saves when unlocked', async () => {
    let saved: Record<string, unknown> | undefined

    const result = await pasteSubredditListFromClipboard({
      clipboard: {
        readText: async () => '/r/Foo\nr/bar\nhttps://reddit.com/r/Baz/',
      },
      save: async (data) => {
        saved = data
      },
    })

    expect(result).toEqual({
      success: true,
      message: 'Imported subreddit list.',
      textareaValue: '/r/foo\n/r/bar\n/r/baz',
      subreddits: ['/r/foo', '/r/bar', '/r/baz'],
    })
    expect(saved).toEqual({ blockedSubreddits: ['/r/foo', '/r/bar', '/r/baz'] })
  })

  it('pastes clipboard text even when the main editor is locked', async () => {
    let saved: Record<string, unknown> | undefined

    const result = await pasteSubredditListFromClipboard({
      clipboard: {
        readText: async () => '/r/foo',
      },
      save: async (data) => {
        saved = data
      },
    })

    expect(result).toEqual({
      success: true,
      message: 'Imported subreddit list.',
      textareaValue: '/r/foo',
      subreddits: ['/r/foo'],
    })
    expect(saved).toEqual({ blockedSubreddits: ['/r/foo'] })
  })
})
