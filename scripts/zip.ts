import { spawn } from 'bun'

async function main() {
  const out = 'subreddit-blocker.zip'
  const cmd = ['zip', '-r', out, 'dist', '-x', '*.DS_Store']
  const proc = spawn({ cmd, stdout: 'inherit', stderr: 'inherit' })
  const code = await proc.exited
  if (code !== 0) {
    throw new Error('zip failed')
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

