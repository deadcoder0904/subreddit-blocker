import { describe, expect, it } from 'bun:test'
import { extractSubreddit, isSupportedHostUrl, parseSubredditInput } from '../../src/shared/utils'

describe('utils', () => {
  it('detects supported hosts', () => {
    expect(isSupportedHostUrl('https://www.reddit.com/r/askreddit')).toBeTrue()
    expect(isSupportedHostUrl('https://old.reddit.com/r/a')).toBeTrue()
    expect(isSupportedHostUrl('https://troddit.com/r/a')).toBeTrue()
    expect(isSupportedHostUrl('https://www.eddrit.com/r/a')).toBeTrue()
    expect(isSupportedHostUrl('https://google.com')).toBeFalse()
  })

  it('extracts subreddit', () => {
    expect(extractSubreddit('https://www.reddit.com/r/AskReddit/')).toBe('/r/askreddit')
    expect(extractSubreddit('https://troddit.com/r/Entrepreneur/')).toBe('/r/entrepreneur')
    expect(extractSubreddit('https://www.eddrit.com/r/Programming/')).toBe('/r/programming')
    expect(extractSubreddit('/r/funny')).toBe('/r/funny')
    expect(extractSubreddit('not a url')).toBeNull()
  })

  it('parses inputs', () => {
    const input = `/r/tech\nr/AskReddit\n/ r/shouldntmatch\nfunny\nhttps://reddit.com/r/Entrepreneur/\nhttps://troddit.com/r/Privacy\nhttps://eddrit.com/r/WebDev` // includes a malformed line with space after '/'
    const out = parseSubredditInput(input)
    expect(out).toContain('/r/askreddit')
    expect(out).toContain('/r/funny')
    expect(out).toContain('/r/entrepreneur')
    expect(out).toContain('/r/privacy')
    expect(out).toContain('/r/webdev')
  })
})
