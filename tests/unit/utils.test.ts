import { describe, expect, it } from 'bun:test'
import { extractSubreddit, isRedditUrl, parseSubredditInput } from '../../src/shared/utils'

describe('utils', () => {
  it('detects reddit urls', () => {
    expect(isRedditUrl('https://www.reddit.com/r/askreddit')).toBeTrue()
    expect(isRedditUrl('https://old.reddit.com/r/a')).toBeTrue()
    expect(isRedditUrl('https://google.com')).toBeFalse()
  })

  it('extracts subreddit', () => {
    expect(extractSubreddit('https://www.reddit.com/r/AskReddit/')).toBe('/r/askreddit')
    expect(extractSubreddit('/r/funny')).toBe('/r/funny')
    expect(extractSubreddit('not a url')).toBeNull()
  })

  it('parses inputs', () => {
    const input = `/r/tech\nr/AskReddit\n/ r/shouldntmatch\nfunny\nhttps://reddit.com/r/Entrepreneur/` // includes a malformed line with space after '/'
    const out = parseSubredditInput(input)
    expect(out).toContain('/r/askreddit')
    expect(out).toContain('/r/funny')
    expect(out).toContain('/r/entrepreneur')
  })
})
