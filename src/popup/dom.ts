export function qs(selector: string): HTMLElement {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Missing element: ${selector}`)
  return el as HTMLElement
}

export function qsa(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector) as NodeListOf<HTMLElement>
}

export function showStatus(el: HTMLElement, text: string, ms = 2000): void {
  el.textContent = text
  if (ms > 0) {
    setTimeout(() => {
      el.textContent = ''
    }, ms)
  }
}

export function setVisible(el: HTMLElement, visible: boolean): void {
  el.classList.toggle('hidden', !visible)
}

export function setInteractivity(el: HTMLElement, interactive: boolean): void {
  if (interactive) {
    el.style.pointerEvents = ''
    el.removeAttribute('aria-disabled')
    el.removeAttribute('tabindex')
    el.classList.remove('opacity-60', 'cursor-not-allowed')
  } else {
    el.style.pointerEvents = 'none'
    el.setAttribute('aria-disabled', 'true')
    el.setAttribute('tabindex', '-1')
    el.classList.add('opacity-60', 'cursor-not-allowed')
  }
}

export function scrollBlockedListToEnd(textarea: HTMLTextAreaElement): void {
  requestAnimationFrame(() => {
    textarea.scrollTop = textarea.scrollHeight
  })
}

export interface PopupElements {
  subredditsTextarea: HTMLTextAreaElement
  enableBlockingCheckbox: HTMLInputElement
  saveButton: HTMLButtonElement
  statusDiv: HTMLDivElement
  themeToggle: HTMLButtonElement
  themeLabel: HTMLSpanElement
  iconSun: SVGElement
  iconMoon: SVGElement
  lockButton: HTMLButtonElement
  toggleContainer: HTMLLabelElement

  // Tabs and Panels
  blockedListTab: HTMLButtonElement
  quickBlockTab: HTMLButtonElement
  scheduleTab: HTMLButtonElement
  blockedListPanel: HTMLDivElement
  quickBlockPanel: HTMLDivElement
  schedulePanel: HTMLDivElement
  lockedEditNotice: HTMLDivElement

  // Quick Block Elements
  quickBlockInput: HTMLInputElement
  quickBlockAdd: HTMLButtonElement
  quickBlockStatus: HTMLDivElement

  // Schedule Form Elements
  addBlockBtn: HTMLButtonElement
  blocksList: HTMLDivElement
  blockForm: HTMLDivElement
  formTitle: HTMLDivElement
  blockIdInput: HTMLInputElement
  blockNameInput: HTMLInputElement
  blockStartInput: HTMLInputElement
  blockEndInput: HTMLInputElement
  saveBlockBtn: HTMLButtonElement
  cancelBlockBtn: HTMLButtonElement
  dayButtons: NodeListOf<HTMLButtonElement>
}

export function getPopupElements(): PopupElements {
  return {
    subredditsTextarea: qs('#subreddits') as HTMLTextAreaElement,
    enableBlockingCheckbox: qs('#enableBlocking') as HTMLInputElement,
    saveButton: qs('#save') as HTMLButtonElement,
    statusDiv: qs('#status') as HTMLDivElement,
    themeToggle: qs('#themeToggle') as HTMLButtonElement,
    themeLabel: qs('#themeLabel') as HTMLSpanElement,
    iconSun: qs('#iconSun') as unknown as SVGElement,
    iconMoon: qs('#iconMoon') as unknown as SVGElement,
    lockButton: qs('#lockToday') as HTMLButtonElement,
    toggleContainer: qs('#toggleContainer') as HTMLLabelElement,

    // Tabs and Panels
    blockedListTab: qs('#blockedListTab') as HTMLButtonElement,
    quickBlockTab: qs('#quickBlockTab') as HTMLButtonElement,
    scheduleTab: qs('#scheduleTab') as HTMLButtonElement,
    blockedListPanel: qs('#blockedListPanel') as HTMLDivElement,
    quickBlockPanel: qs('#quickBlockPanel') as HTMLDivElement,
    schedulePanel: qs('#schedulePanel') as HTMLDivElement,
    lockedEditNotice: qs('#lockedEditNotice') as HTMLDivElement,

    // Quick Block Elements
    quickBlockInput: qs('#quickBlockInput') as HTMLInputElement,
    quickBlockAdd: qs('#quickBlockAdd') as HTMLButtonElement,
    quickBlockStatus: qs('#quickBlockStatus') as HTMLDivElement,

    // Schedule Form Elements
    addBlockBtn: qs('#addBlockBtn') as HTMLButtonElement,
    blocksList: qs('#blocksList') as HTMLDivElement,
    blockForm: qs('#blockForm') as HTMLDivElement,
    formTitle: qs('#formTitle') as HTMLDivElement,
    blockIdInput: qs('#blockId') as HTMLInputElement,
    blockNameInput: qs('#blockName') as HTMLInputElement,
    blockStartInput: qs('#blockStart') as HTMLInputElement,
    blockEndInput: qs('#blockEnd') as HTMLInputElement,
    saveBlockBtn: qs('#saveBlockBtn') as HTMLButtonElement,
    cancelBlockBtn: qs('#cancelBlockBtn') as HTMLButtonElement,
    dayButtons: document.querySelectorAll('.day-btn') as NodeListOf<HTMLButtonElement>,
  }
}
