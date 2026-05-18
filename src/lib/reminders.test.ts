import { describe, expect, it } from 'vitest'
import { getLocalParts, isReminderDue, timeToMinutes } from './reminders'

describe('reminder helpers', () => {
  it('converts time strings into minutes', () => {
    expect(timeToMinutes('20:00')).toBe(1200)
    expect(timeToMinutes('08:15')).toBe(495)
  })

  it('reads date and time in a target timezone', () => {
    expect(getLocalParts(new Date('2026-05-18T13:00:00.000Z'), 'Asia/Bangkok')).toEqual({
      dateKey: '2026-05-18',
      minutes: 20 * 60,
    })
  })

  it('detects due reminders in the scheduled window', () => {
    expect(
      isReminderDue({
        now: new Date('2026-05-18T13:07:00.000Z'),
        timezone: 'Asia/Bangkok',
        reminderTime: '20:00',
        lastSentDate: '2026-05-17',
      }),
    ).toBe(true)
  })

  it('does not send twice on the same local day', () => {
    expect(
      isReminderDue({
        now: new Date('2026-05-18T13:07:00.000Z'),
        timezone: 'Asia/Bangkok',
        reminderTime: '20:00',
        lastSentDate: '2026-05-18',
      }),
    ).toBe(false)
  })

  it('skips reminders outside the delivery window', () => {
    expect(
      isReminderDue({
        now: new Date('2026-05-18T13:25:00.000Z'),
        timezone: 'Asia/Bangkok',
        reminderTime: '20:00',
        lastSentDate: '2026-05-17',
      }),
    ).toBe(false)
  })
})
