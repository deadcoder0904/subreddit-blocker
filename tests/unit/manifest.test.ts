import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SUPPORTED_HOST_PATTERNS } from '../../src/shared/constants'

const manifestPaths = ['manifests/manifest.chrome.json', 'manifests/manifest.firefox.json']

describe('manifest host permissions', () => {
  it('match supported host patterns', () => {
    for (const manifestPath of manifestPaths) {
      const manifest = JSON.parse(
        readFileSync(join(import.meta.dir, '../..', manifestPath), 'utf8')
      )

      expect(manifest.host_permissions).toEqual(SUPPORTED_HOST_PATTERNS)
    }
  })
})
