import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type Target = 'chrome' | 'firefox'
const TARGET: Target = (process.env.BROWSER as Target) || 'chrome'
const PROD = process.env.NODE_ENV === 'production'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_BASE = path.resolve(ROOT, 'dist')
const DIST = path.resolve(OUT_BASE, TARGET)

async function clean() {
  await rm(DIST, { recursive: true, force: true })
  await mkdir(OUT_BASE, { recursive: true })
  await mkdir(DIST, { recursive: true })
}

async function bundle() {
  const result = await Bun.build({
    entrypoints: [
      path.resolve('src/background/service-worker.ts'),
      path.resolve('src/popup/popup.ts'),
      path.resolve('src/pages/blocked-theme.ts'),
    ],
    outdir: DIST,
    target: 'browser',
    sourcemap: !PROD ? 'external' : 'none',
    minify: PROD,
  })
  if (!result.success) {
    console.error('[build] TS build failed')
    result.logs.forEach((l) => {
      console.error(l)
    })
    throw new Error('Build failed')
  }

  // Move compiled files to expected root locations
  // Bun preserves entry subdirectories (background/service-worker.js, popup/popup.js)
  // We want: background.js and popup.js at dist root
  const swSrc = path.join(DIST, 'background', 'service-worker.js')
  const swOut = path.join(DIST, 'background.js')
  const popupSrc = path.join(DIST, 'popup', 'popup.js')
  const popupOut = path.join(DIST, 'popup.js')
  const blockedThemeSrc = path.join(DIST, 'pages', 'blocked-theme.js')
  const blockedThemeOut = path.join(DIST, 'blocked-theme.js')

  try {
    const swCode = await Bun.file(swSrc).text()
    await Bun.write(swOut, swCode)
  } catch {
    console.warn('[build] background.js missing?')
  }

  try {
    const popupCode = await Bun.file(popupSrc).text()
    await Bun.write(popupOut, popupCode)
  } catch {
    console.warn('[build] popup.js missing?')
  }

  try {
    const code = await Bun.file(blockedThemeSrc).text()
    await Bun.write(blockedThemeOut, code)
  } catch {
    console.warn('[build] blocked-theme.js missing?')
  }

  // For Firefox, re-bundle background as classic IIFE for background.scripts compatibility
  if (TARGET === 'firefox') {
    const bgOut = path.join(DIST, 'background.js')
    const res2 = await Bun.build({
      entrypoints: [path.resolve('src/background/service-worker.ts')],
      outdir: DIST,
      target: 'browser',
      sourcemap: !PROD ? 'external' : 'none',
      minify: PROD,
      format: 'iife',
      naming: {
        entry: 'background.js',
      },
    })
    if (!res2.success) {
      console.error('[build] Firefox background (iife) build failed')
      res2.logs.forEach((l) => {
        console.error(l)
      })
      throw new Error('Build failed')
    }
    // Ensure expected filename
    try {
      const iifeFile = path.join(DIST, 'service-worker.js')
      const code = await Bun.file(iifeFile).text()
      await Bun.write(bgOut, code)
    } catch {
      // noop if naming worked
    }
  }
}

async function css() {
  // Use tailwindcss CLI via bunx
  const pairs = [
    ['src/styles/popup.css', path.join(DIST, 'styles/popup.css')],
    ['src/styles/blocked.css', path.join(DIST, 'styles/blocked.css')],
  ] as const

  // Run sequentially to avoid bun x symlink EEXIST races
  for (const [input, output] of pairs) {
    await mkdir(path.dirname(output), { recursive: true })
    const args = [
      'x',
      '@tailwindcss/cli',
      '-i',
      input,
      '-o',
      output,
      '--content',
      'src/**/*.{html,ts,tsx,js}',
    ]
    if (PROD) args.push('--minify')
    const proc = Bun.spawn({
      cmd: ['bun', ...args],
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const code = await proc.exited
    if (code !== 0) throw new Error(`[css] Tailwind failed for ${input}`)
  }
}

async function html() {
  await cp('src/popup/popup.html', path.join(DIST, 'popup.html'))
  await cp('src/pages/blocked.html', path.join(DIST, 'blocked.html'))
}

async function icons() {
  // Generate icons fresh each build after cleaning
  const proc = Bun.spawn({
    cmd: ['bun', 'run', 'scripts/generate-icons.ts'],
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, ICONS_OUT_DIR: path.join(DIST, 'icons') },
  })
  const code = await proc.exited
  if (code !== 0) throw new Error('[icons] generation failed')
}

async function manifest() {
  const pkg = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'))
  const basePath = path.resolve('manifests', `manifest.${TARGET}.json`)
  const base = JSON.parse(await readFile(basePath, 'utf8'))
  // Enrich with version from package.json
  const merged = { ...base, version: pkg.version ?? '1.0.0' }
  await writeFile(path.join(DIST, 'manifest.json'), JSON.stringify(merged, null, 2))
}

async function main() {
  await clean()
  await icons()
  await Promise.all([bundle(), css(), html()])
  await manifest()
  console.log(`[build] Done for ${TARGET} (${PROD ? 'prod' : 'dev'})`)
}

await main()
