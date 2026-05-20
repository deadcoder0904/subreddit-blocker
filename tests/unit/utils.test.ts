import { describe, expect, it } from 'bun:test'
import {
  extractSubreddit,
  isSupportedHostUrl,
  parseSubredditInput,
  formatListForTextarea,
  mergeSubredditLists,
  getDaysText,
  formatSubredditDisplayName,
  handleQuickBlockInput,
} from '../../src/shared/utils'

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

  it('formats lists for textarea correctly', () => {
    expect(formatListForTextarea(['/r/funny', 'r/news', 'pics'])).toBe('/r/funny\n/r/news\npics')
  })

  it('merges subreddit lists correctly without duplicates', () => {
    const list1 = ['/r/funny', '/r/pics']
    const list2 = ['/r/pics', '/r/videos']
    expect(mergeSubredditLists(list1, list2)).toEqual(['/r/funny', '/r/pics', '/r/videos'])
  })

  it('formats weekday / weekend / daily arrays to friendly text', () => {
    expect(getDaysText([0, 1, 2, 3, 4, 5, 6])).toBe('Daily')
    expect(getDaysText([1, 2, 3, 4, 5])).toBe('Weekdays')
    expect(getDaysText([0, 6])).toBe('Weekends')
    expect(getDaysText([1, 3])).toBe('Mon, Wed')
    expect(getDaysText([4, 2])).toBe('Tue, Thu') // verifies calendar sorting
  })

  it('formats display names of subreddits correctly', () => {
    expect(formatSubredditDisplayName('ufc')).toBe('/r/ufc')
    expect(formatSubredditDisplayName('r/ufc')).toBe('/r/ufc')
    expect(formatSubredditDisplayName('/r/ufc')).toBe('/r/ufc')
  })

  describe('handleQuickBlockInput', () => {
    it('returns success for a new subreddit', () => {
      const current = ['/r/funny', '/r/pics']
      const res = handleQuickBlockInput('ufc', current)
      expect(res.success).toBeTrue()
      expect(res.message).toBe('Blocked /r/ufc')
      expect(res.nextList).toEqual(['/r/funny', '/r/pics', '/r/ufc'])
      expect(res.isError).toBeFalsy()
    })

    it('returns error when subreddit is already blocked', () => {
      const current = ['/r/funny', '/r/pics', '/r/ufc']
      const res = handleQuickBlockInput('ufc', current)
      expect(res.success).toBeFalse()
      expect(res.message).toBe('/r/ufc is already blocked.')
      expect(res.isError).toBeTrue()
    })

    it('returns error when input is empty or invalid', () => {
      const current = ['/r/funny']
      const res = handleQuickBlockInput('   ', current)
      expect(res.success).toBeFalse()
      expect(res.message).toBe('Enter a subreddit or supported URL.')
      expect(res.isError).toBeTrue()
    })

    it('filters out already blocked subreddits and blocks only new ones', () => {
      const current = ['/r/funny', '/r/pics']
      const res = handleQuickBlockInput('funny\nufc', current)
      expect(res.success).toBeTrue()
      expect(res.message).toBe('Blocked /r/ufc')
      expect(res.nextList).toEqual(['/r/funny', '/r/pics', '/r/ufc'])
    })
  })
})
