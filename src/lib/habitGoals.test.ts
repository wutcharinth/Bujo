import { describe, expect, it } from 'vitest'
import { getHabitGoalProgress, getWindowGoalStats, normalizeWeeklyTarget } from './habitGoals'
import type { Habit } from '../types'

const baseHabit: Habit = {
  id: 'laundry',
  name: 'Laundry',
  icon: 'laundry',
  color: 'teal',
  active: true,
  frequency: 'weekly',
  weeklyTarget: 2,
  reminderEnabled: false,
  reminderTime: '20:00',
  timerEnabled: false,
  timerMinutes: 10,
}

describe('habit goals', () => {
  it('normalizes weekly targets into the supported range', () => {
    expect(normalizeWeeklyTarget(0)).toBe(1)
    expect(normalizeWeeklyTarget(3)).toBe(3)
    expect(normalizeWeeklyTarget(12)).toBe(7)
    expect(normalizeWeeklyTarget(Number.NaN)).toBe(3)
  })

  it('tracks weekly target progress separately from today check-ins', () => {
    expect(
      getHabitGoalProgress(
        baseHabit,
        [
          { habitId: 'laundry', date: '2026-05-18' },
          { habitId: 'laundry', date: '2026-05-20' },
        ],
        '2026-05-21',
        ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24'],
      ),
    ).toMatchObject({
      completedToday: false,
      current: 2,
      target: 2,
      weekCount: 2,
      onTrack: true,
    })
  })

  it('calculates weekly goal rates by target instead of daily expectation', () => {
    expect(
      getWindowGoalStats(
        [baseHabit],
        [
          { habitId: 'laundry', date: '2026-05-18' },
          { habitId: 'laundry', date: '2026-05-20' },
          { habitId: 'laundry', date: '2026-05-25' },
        ],
        [
          '2026-05-18',
          '2026-05-19',
          '2026-05-20',
          '2026-05-21',
          '2026-05-22',
          '2026-05-23',
          '2026-05-24',
          '2026-05-25',
          '2026-05-26',
          '2026-05-27',
          '2026-05-28',
          '2026-05-29',
          '2026-05-30',
          '2026-05-31',
        ],
      ),
    ).toEqual({ completed: 3, possible: 4, rate: 75 })
  })
})
