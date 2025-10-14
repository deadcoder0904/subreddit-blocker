import { spawn } from 'bun'

import { stat } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const target = process.env.BROWSER || process.env.TARGET || 'chrome'
  const dir = path.resolve('dist', target)
  // Verify manifest exists at root of target dir
  try {
    await stat(path.join(dir, 'manifest.json'))
  } catch {
    throw new Error(`manifest.json not found in ${dir}. Did you run build for ${target}?`)
  }

  // For AMO, prefer .xpi; for Chrome, .zip
  const outName =
    target === 'firefox' ? 'subreddit-blocker-firefox.xpi' : 'subreddit-blocker-chrome.zip'
  const outPath = path.resolve('dist', outName)

  // Zip contents of target dir so manifest.json is at archive root
  const cmd = ['zip', '-r', '-FS', '-X', outPath, '.', '-x', '*.DS_Store']
  const proc = spawn({ cmd, cwd: dir, stdout: 'inherit', stderr: 'inherit' })
  const code = await proc.exited
  if (code !== 0) throw new Error('zip failed')
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
