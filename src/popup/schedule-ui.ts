import browser from 'webextension-polyfill'
import { STORAGE_KEYS } from '../shared/constants'
import { getActiveTimeBlock, isTimeBlockActive, formatTime12Hour } from '../shared/lock'
import { getDaysText } from '../shared/utils'
import type { TimeBlock } from '../shared/types'
import { setVisible } from './dom'

export interface ScheduleElements {
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
  enableBlockingCheckbox: HTMLInputElement
}

export function setupScheduleUI(
  elements: ScheduleElements,
  timeBlocks: TimeBlock[],
  locked: boolean
): void {
  let localTimeBlocks = [...timeBlocks]

  const {
    addBlockBtn,
    blocksList,
    blockForm,
    formTitle,
    blockIdInput,
    blockNameInput,
    blockStartInput,
    blockEndInput,
    saveBlockBtn,
    cancelBlockBtn,
    dayButtons,
    enableBlockingCheckbox,
  } = elements

  const renderTimeBlocks = () => {
    blocksList.innerHTML = ''
    if (localTimeBlocks.length === 0) {
      blocksList.innerHTML =
        '<div class="text-xs text-muted text-center py-4">No schedules set. Click "+ Add block" to create one.</div>'
      return
    }

    localTimeBlocks.forEach((block) => {
      const card = document.createElement('div')
      const isActive = isTimeBlockActive(block)
      const isEnabled = block.enabled

      let cardClass =
        'schedule-card flex items-center justify-between p-2.5 rounded-lg border transition-all duration-150 '
      if (!isEnabled) {
        cardClass += 'bg-panel-2 border-border opacity-50 hover:opacity-70'
      } else if (isActive) {
        cardClass += 'bg-(--color-panel) border-(--color-accent) shadow-sm'
      } else {
        cardClass += 'bg-panel-2 border-border hover:border-border/80'
      }
      card.className = cardClass

      const badge =
        isEnabled && isActive
          ? '<span class="px-1.5 py-0.2 text-[9px] bg-accent/20 text-accent font-bold rounded uppercase tracking-wider">Active</span>'
          : ''

      const daysStr = getDaysText(block.days)
      const editBtnHtml = locked
        ? ''
        : `<button class="edit-block-btn p-1 text-muted hover:text-text rounded hover:bg-panel cursor-pointer" data-id="${block.id}" title="Edit block">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
           </button>`
      const deleteBtnHtml = locked
        ? ''
        : `<button class="delete-block-btn p-1 text-muted hover:text-accent rounded hover:bg-panel cursor-pointer" data-id="${block.id}" title="Delete block">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
           </button>`
      const checkboxDisabledAttr = locked ? 'disabled' : ''
      const timeRangeStr = `${formatTime12Hour(block.startTime)} - ${formatTime12Hour(block.endTime)}`

      card.innerHTML = `
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-semibold text-xs text-text truncate">${block.name || 'Untitled'}</span>
            ${badge}
          </div>
          <span class="text-[11px] text-muted">${timeRangeStr} (${daysStr})</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${editBtnHtml}
          ${deleteBtnHtml}
          <label class="switch shrink-0 ml-1">
            <input type="checkbox" class="toggle-block-btn" data-id="${block.id}" ${block.enabled ? 'checked' : ''} ${checkboxDisabledAttr} />
            <span class="slider"></span>
          </label>
        </div>
      `

      if (!locked) {
        card.querySelector('.edit-block-btn')?.addEventListener('click', () => {
          editBlock(block)
        })
        card.querySelector('.delete-block-btn')?.addEventListener('click', async () => {
          if (confirm(`Delete block "${block.name || 'Untitled'}"?`)) {
            localTimeBlocks = localTimeBlocks.filter((b) => b.id !== block.id)
            await browser.storage.local.set({
              [STORAGE_KEYS.timeBlocks]: localTimeBlocks,
            })
            renderTimeBlocks()
          }
        })
        card.querySelector('.toggle-block-btn')?.addEventListener('change', async (e) => {
          const cb = e.target as HTMLInputElement
          localTimeBlocks = localTimeBlocks.map((b) =>
            b.id === block.id ? { ...b, enabled: cb.checked } : b
          )
          await browser.storage.local.set({
            [STORAGE_KEYS.timeBlocks]: localTimeBlocks,
          })

          const activeBlockAfterToggle = getActiveTimeBlock(localTimeBlocks)
          if (activeBlockAfterToggle !== null) {
            enableBlockingCheckbox.checked = true
            await browser.storage.local.set({
              [STORAGE_KEYS.extensionEnabled]: true,
            })
            window.location.reload()
          } else {
            renderTimeBlocks()
          }
        })
      }

      blocksList.appendChild(card)
    })
  }

  const editBlock = (block: TimeBlock) => {
    setVisible(blocksList, false)
    setVisible(addBlockBtn, false)
    setVisible(blockForm, true)

    formTitle.textContent = 'Edit Time Block'
    blockIdInput.value = block.id
    blockNameInput.value = block.name
    blockStartInput.value = block.startTime
    blockEndInput.value = block.endTime

    dayButtons.forEach((btn) => {
      const dayNum = Number(btn.dataset.day)
      btn.classList.toggle('active', block.days.includes(dayNum))
    })
  }

  // Bind day buttons selection toggles
  dayButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (locked) return
      btn.classList.toggle('active')
    })
  })

  // Add block trigger
  addBlockBtn.addEventListener('click', () => {
    if (locked) return
    setVisible(blocksList, false)
    setVisible(addBlockBtn, false)
    setVisible(blockForm, true)

    formTitle.textContent = 'New Time Block'
    blockIdInput.value = ''

    const rand = getRandomSchedule()
    blockNameInput.value = rand.name
    blockStartInput.value = rand.startTime
    blockEndInput.value = rand.endTime

    dayButtons.forEach((btn) => {
      const day = Number(btn.dataset.day)
      btn.classList.toggle('active', rand.days.includes(day))
    })
  })

  // Cancel form
  cancelBlockBtn.addEventListener('click', () => {
    setVisible(blockForm, false)
    setVisible(blocksList, true)
    setVisible(addBlockBtn, true)
  })

  // Save Block
  saveBlockBtn.addEventListener('click', async () => {
    if (locked) return

    const name = blockNameInput.value.trim()
    const startTime = blockStartInput.value
    const endTime = blockEndInput.value

    const selectedDays: number[] = []
    dayButtons.forEach((btn) => {
      if (btn.classList.contains('active')) {
        selectedDays.push(Number(btn.dataset.day))
      }
    })

    if (!startTime || !endTime) {
      alert('Please specify both start and end times.')
      return
    }
    if (selectedDays.length === 0) {
      alert('Please select at least one day of the week.')
      return
    }

    const id = blockIdInput.value || Date.now().toString()
    const newBlock: TimeBlock = {
      id,
      name: name || 'Focus Block',
      startTime,
      endTime,
      days: selectedDays,
      enabled: true,
    }

    if (blockIdInput.value) {
      localTimeBlocks = localTimeBlocks.map((b) => (b.id === id ? newBlock : b))
    } else {
      localTimeBlocks.push(newBlock)
    }

    await browser.storage.local.set({ [STORAGE_KEYS.timeBlocks]: localTimeBlocks })

    const activeBlockAfterSave = getActiveTimeBlock(localTimeBlocks)
    if (activeBlockAfterSave !== null) {
      await browser.storage.local.set({
        [STORAGE_KEYS.extensionEnabled]: true,
      })
      window.location.reload()
    } else {
      renderTimeBlocks()
      setVisible(blockForm, false)
      setVisible(blocksList, true)
      setVisible(addBlockBtn, true)
    }
  })

  // Initial state
  setVisible(blockForm, false)
  setVisible(blocksList, true)
  if (!locked) {
    setVisible(addBlockBtn, true)
  }

  // Initial render
  renderTimeBlocks()
}

function pad(num: number): string {
  return String(num).padStart(2, '0')
}

function getRandomSchedule(): { startTime: string; endTime: string; days: number[]; name: string } {
  const startHour = Math.floor(Math.random() * 15) + 7 // 07:00 to 21:00
  const startMinute = Math.random() < 0.5 ? 0 : 30
  const durationHours = Math.floor(Math.random() * 4) + 1 // 1 to 4 hours

  const endHour = (startHour + durationHours) % 24
  const endMinute = startMinute

  const startTime = `${pad(startHour)}:${pad(startMinute)}`
  const endTime = `${pad(endHour)}:${pad(endMinute)}`

  const patternType = Math.floor(Math.random() * 4)
  let days: number[] = []
  let name = 'Focus Block'

  if (patternType === 0) {
    days = [1, 2, 3, 4, 5]
    name = 'Work Focus'
  } else if (patternType === 1) {
    days = [0, 6]
    name = 'Weekend Chill'
  } else if (patternType === 2) {
    days = [0, 1, 2, 3, 4, 5, 6]
    name = 'Daily Focus'
  } else {
    const allDays = [0, 1, 2, 3, 4, 5, 6]
    /* eslint-disable-next-line unicorn/no-array-sort */
    const shuffled = [...allDays].sort(() => 0.5 - Math.random())
    /* eslint-disable-next-line unicorn/no-array-sort */
    days = shuffled.slice(0, 3).sort((a, b) => a - b)
    name = 'Custom Focus'
  }

  return { startTime, endTime, days, name }
}
