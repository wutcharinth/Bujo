import { describe, expect, it } from 'vitest'
import { toHabitWrite } from './useBujoData'
import type { Habit, NewHabitInput } from '../types'

describe('habit write payloads', () => {
  it('keeps Firestore writes free of edit-only and undefined fields', () => {
    const editedHabit = {
      id: 'habit-1',
      name: '  Read  ',
      icon: 'book',
      color: 'gold',
      active: true,
      reminderEnabled: true,
      reminderTime: '21:00',
      lastReminderDate: undefined,
      timerEnabled: true,
      timerMinutes: 20,
    } satisfies Habit

    const payload = toHabitWrite(editedHabit as NewHabitInput)

    expect(payload).toEqual({
      name: 'Read',
      icon: 'book',
      color: 'gold',
      reminderEnabled: true,
      reminderTime: '21:00',
      timerEnabled: true,
      timerMinutes: 20,
    })
    expect(Object.hasOwn(payload, 'id')).toBe(false)
    expect(Object.hasOwn(payload, 'active')).toBe(false)
    expect(Object.hasOwn(payload, 'lastReminderDate')).toBe(false)
  })

  it('normalizes empty reminder times and timer minutes', () => {
    expect(
      toHabitWrite({
        name: 'Move',
        icon: 'steps',
        color: 'green',
        reminderEnabled: true,
        reminderTime: '',
        timerEnabled: true,
        timerMinutes: Number.NaN,
      }),
    ).toMatchObject({
      reminderTime: '20:00',
      timerMinutes: 1,
    })
  })
})
