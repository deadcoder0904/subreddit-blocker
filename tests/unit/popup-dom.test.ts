import { describe, expect, it } from 'bun:test'
import { setVisible, setInteractivity, showStatus } from '../../src/popup/dom'
import { applyTheme } from '../../src/popup/theme'
import { applyLockState } from '../../src/popup/lock-ui'

interface MockElement {
  classList: {
    classes: Set<string>
    add(...cls: string[]): void
    remove(...cls: string[]): void
    toggle(cls: string, force?: boolean): void
    contains(cls: string): boolean
  }
  style: {
    pointerEvents: string
  }
  mockAttributes: Record<string, string>
  setAttribute(name: string, val: string): void
  removeAttribute(name: string): void
  textContent: string
  innerHTML: string
  readOnly: boolean
  disabled: boolean
  className: string
  blur(): void
  blurred: boolean
  children: MockElement[]
  appendChild(child: MockElement): void
  querySelector(selector: string): MockElement | null
  tagName?: string
  addEventListener(type: string, cb: Function): void
}

// Mock document for global reference where needed
const globalBody = {
  setAttribute: (name: string, val: string) => {
    globalBody.attrs[name] = val
  },
  attrs: {} as Record<string, string>,
}
globalThis.document = {
  body: globalBody as unknown as HTMLElement,
  createElement: (tag: string) => {
    return createMockElement(tag.toUpperCase()) as unknown as HTMLElement
  },
} as unknown as Document

function createMockElement(tagName?: string): MockElement {
  let classNameValue = ''
  const el: MockElement = {
    classList: {
      classes: new Set<string>(),
      add(...classes: string[]) {
        classes.forEach((cls) => this.classes.add(cls))
      },
      remove(...classes: string[]) {
        classes.forEach((cls) => this.classes.delete(cls))
      },
      toggle(cls: string, force?: boolean) {
        if (force === undefined) {
          if (this.classes.has(cls)) this.classes.delete(cls)
          else this.classes.add(cls)
        } else if (force) {
          this.classes.add(cls)
        } else {
          this.classes.delete(cls)
        }
      },
      contains(cls: string) {
        return this.classes.has(cls)
      },
    },
    style: {
      pointerEvents: '',
    },
    mockAttributes: {},
    setAttribute(name: string, val: string) {
      this.mockAttributes[name] = val
    },
    removeAttribute(name: string) {
      delete this.mockAttributes[name]
    },
    textContent: '',
    innerHTML: '',
    readOnly: false,
    disabled: false,
    className: '',
    blur() {
      this.blurred = true
    },
    blurred: false,
    children: [],
    appendChild(child: MockElement) {
      this.children.push(child)
    },
    querySelector(selector: string) {
      if (selector === 'button') {
        return this.children.find((c) => c.tagName === 'BUTTON') ?? null
      }
      return null
    },
    tagName,
    addEventListener(_type: string, _cb: Function) {
      // Mock event registration
    },
  }

  Object.defineProperty(el, 'className', {
    get() {
      return classNameValue
    },
    set(val: string) {
      classNameValue = val
      el.classList.classes.clear()
      val
        .split(/\s+/)
        .filter(Boolean)
        .forEach((cls) => el.classList.classes.add(cls))
    },
    configurable: true,
    enumerable: true,
  })

  return el
}

describe('DOM helper unit tests with mocks', () => {
  it('setVisible toggles hidden class', () => {
    const el = createMockElement()
    setVisible(el as unknown as HTMLElement, false)
    expect(el.classList.contains('hidden')).toBeTrue()

    setVisible(el as unknown as HTMLElement, true)
    expect(el.classList.contains('hidden')).toBeFalse()
  })

  it('setInteractivity changes styles and attributes', () => {
    const el = createMockElement()
    setInteractivity(el as unknown as HTMLElement, false)
    expect(el.style.pointerEvents).toBe('none')
    expect(el.mockAttributes['aria-disabled']).toBe('true')
    expect(el.mockAttributes['tabindex']).toBe('-1')
    expect(el.classList.contains('opacity-60')).toBeTrue()
    expect(el.classList.contains('cursor-not-allowed')).toBeTrue()

    setInteractivity(el as unknown as HTMLElement, true)
    expect(el.style.pointerEvents).toBe('')
    expect(el.mockAttributes['aria-disabled']).toBeUndefined()
    expect(el.mockAttributes['tabindex']).toBeUndefined()
    expect(el.classList.contains('opacity-60')).toBeFalse()
    expect(el.classList.contains('cursor-not-allowed')).toBeFalse()
  })

  it('showStatus updates text and clears it after timeout', () => {
    const el = createMockElement()
    showStatus(el as unknown as HTMLElement, 'Test Status', -1) // negative timeout disables timer for sync test
    expect(el.textContent).toBe('Test Status')
  })
})

describe('Theme helper unit tests with mocks', () => {
  it('applyTheme sets dark theme correctly', () => {
    globalBody.attrs = {}
    const label = createMockElement()
    const sun = createMockElement()
    const moon = createMockElement()

    applyTheme(
      'dark',
      label as unknown as HTMLElement,
      sun as unknown as HTMLElement,
      moon as unknown as HTMLElement
    )
    expect(globalBody.attrs['data-theme']).toBe('dark')
    expect(label.textContent).toBe('Dark')
    expect(sun.classList.contains('hidden')).toBeFalse()
    expect(moon.classList.contains('hidden')).toBeTrue()
  })

  it('applyTheme sets light theme correctly', () => {
    globalBody.attrs = {}
    const label = createMockElement()
    const sun = createMockElement()
    const moon = createMockElement()

    applyTheme(
      'light',
      label as unknown as HTMLElement,
      sun as unknown as HTMLElement,
      moon as unknown as HTMLElement
    )
    expect(globalBody.attrs['data-theme']).toBe('light')
    expect(label.textContent).toBe('Light')
    expect(sun.classList.contains('hidden')).toBeTrue()
    expect(moon.classList.contains('hidden')).toBeFalse()
  })
})

describe('Lock state helper unit tests with mocks', () => {
  it('applyLockState applies readOnly and styles when locked', () => {
    const saveBtn = createMockElement()
    const toggleContainer = createMockElement()
    const textarea = createMockElement()
    const container = createMockElement()
    const statusDiv = createMockElement()

    applyLockState(
      true,
      [
        saveBtn as unknown as HTMLElement,
        toggleContainer as unknown as HTMLElement,
        textarea as unknown as HTMLElement,
      ],
      container as unknown as HTMLDivElement,
      statusDiv as unknown as HTMLDivElement,
      textarea as unknown as HTMLTextAreaElement,
      false,
      [],
      '',
      () => {}
    )

    // controls assertions
    expect(textarea.readOnly).toBeTrue()
    expect(textarea.classList.contains('opacity-80')).toBeTrue()
    expect(textarea.blurred).toBeTrue()

    expect(saveBtn.style.pointerEvents).toBe('none')
    expect(saveBtn.classList.contains('opacity-60')).toBeTrue()

    // lock button assertions
    const lockBtn = (container as unknown as MockElement).children[0]
    expect(lockBtn).not.toBeUndefined()
    expect(lockBtn.style.pointerEvents).toBe('none')
    expect(lockBtn.mockAttributes['aria-disabled']).toBe('true')
    expect(lockBtn.innerHTML).toContain('Locked for today')
  })

  it('renders a disabled button with correct cursor style when unlocked and no schedules exist', () => {
    const saveBtn = createMockElement()
    const toggleContainer = createMockElement()
    const textarea = createMockElement()
    const container = createMockElement()
    const statusDiv = createMockElement()

    applyLockState(
      false,
      [
        saveBtn as unknown as HTMLElement,
        toggleContainer as unknown as HTMLElement,
        textarea as unknown as HTMLElement,
      ],
      container as unknown as HTMLDivElement,
      statusDiv as unknown as HTMLDivElement,
      textarea as unknown as HTMLTextAreaElement,
      false,
      [],
      '',
      () => {}
    )

    const btn = (container as unknown as MockElement).children[0]
    expect(btn).not.toBeUndefined()
    expect(btn.disabled).toBeTrue()
    expect(btn.style.pointerEvents).not.toBe('none')
    expect(btn.classList.contains('cursor-not-allowed')).toBeTrue()
  })

  it('renders dynamic block buttons with time range in brackets when unlocked and schedules exist', () => {
    const saveBtn = createMockElement()
    const toggleContainer = createMockElement()
    const textarea = createMockElement()
    const container = createMockElement()
    const statusDiv = createMockElement()
    const timeBlocks = [
      {
        id: 'work-id',
        name: 'Work',
        startTime: '13:00',
        endTime: '19:00',
        days: [1, 2, 3, 4, 5],
        enabled: true,
      },
    ]

    applyLockState(
      false,
      [
        saveBtn as unknown as HTMLElement,
        toggleContainer as unknown as HTMLElement,
        textarea as unknown as HTMLElement,
      ],
      container as unknown as HTMLDivElement,
      statusDiv as unknown as HTMLDivElement,
      textarea as unknown as HTMLTextAreaElement,
      false,
      timeBlocks,
      '',
      () => {}
    )

    const btn = (container as unknown as MockElement).children[0]
    expect(btn).not.toBeUndefined()
    expect(btn.innerHTML).toContain('Block Work (until 7pm)')
    expect(btn.mockAttributes['title']).toBe('Locks editing immediately until 7pm')
  })
})
