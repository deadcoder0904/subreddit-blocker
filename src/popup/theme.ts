import { DEFAULTS, THEMES } from '../shared/constants'

export function applyTheme(
  theme: 'light' | 'dark',
  labelEl: HTMLElement,
  sunIcon: Element,
  moonIcon: Element
): void {
  const t = THEMES.includes(theme) ? theme : DEFAULTS.theme
  document.body.setAttribute('data-theme', t)
  labelEl.textContent = t === 'dark' ? 'Dark' : 'Light'
  if (t === 'dark') {
    sunIcon.classList.remove('hidden')
    moonIcon.classList.add('hidden')
  } else {
    sunIcon.classList.add('hidden')
    moonIcon.classList.remove('hidden')
  }
}

export function setupThemeToggle(
  themeToggle: HTMLButtonElement,
  themeLabel: HTMLSpanElement,
  iconSun: SVGElement | Element,
  iconMoon: SVGElement | Element,
  initialTheme: 'light' | 'dark',
  onThemeSave: (nextTheme: 'light' | 'dark') => Promise<void>
): void {
  applyTheme(initialTheme, themeLabel, iconSun, iconMoon)

  themeToggle.addEventListener('click', async () => {
    const current = document.body.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    applyTheme(next, themeLabel, iconSun, iconMoon)
    await onThemeSave(next)
  })
}
