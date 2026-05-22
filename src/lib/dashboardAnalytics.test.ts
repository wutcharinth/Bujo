import { describe, expect, it } from 'vitest'
import { buildDashboardAnalytics } from './dashboardAnalytics'
import type { Habit } from '../types'

const makeHabit = (id: string, name: string): Habit => ({
  id,
  name,
  icon: 'sparkles',
  color: 'blue',
  active: true,
  frequency: 'daily',
  weeklyTarget: 3,
  weeklyDays: [],
  reminderEnabled: false,
  reminderTime: '20:00',
  timerEnabled: false,
  timerMinutes: 10,
  shareLevel: 'private',
  sharedCircleIds: [],
})

describe('dashboard analytics', () => {
  it('surfaces focus, risk, and weekly coaching copy', () => {
    const read = makeHabit('read', 'Read')
    const move = makeHabit('move', 'Move')
    const recentKeys = [
      '2026-05-11',
      '2026-05-12',
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
      '2026-05-16',
      '2026-05-17',
      '2026-05-18',
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
    ]

    const analytics = buildDashboardAnalytics({
      activeHabits: [read, move],
      checkins: [
        { habitId: 'read', date: '2026-05-18' },
        { habitId: 'read', date: '2026-05-19' },
        { habitId: 'read', date: '2026-05-20' },
        { habitId: 'read', date: '2026-05-21' },
        { habitId: 'read', date: '2026-05-22' },
        { habitId: 'move', date: '2026-05-18' },
      ],
      moods: [
        { id: 'mood-1', date: '2026-05-21', timeOfDay: 'evening', value: 'good' },
        { id: 'mood-2', date: '2026-05-22', timeOfDay: 'evening', value: 'great' },
      ],
      drinks: [{ id: 'drink-1', date: '2026-05-22', water: 6, coffee: 1, alcohol: 0, wine: 0, softdrink: 0 }],
      currentSevenKeys: recentKeys.slice(7),
      previousSevenKeys: recentKeys.slice(0, 7),
      recentKeys,
      rhythmKeys: recentKeys,
    })

    expect(analytics.currentRate).toBeGreaterThan(analytics.previousRate)
    expect(analytics.focusHabit?.habit.id).toBe('move')
    expect(analytics.riskHabits.map((item) => item.habit.id)).toContain('move')
    expect(analytics.todayFocus).toContain('Move')
    expect(analytics.moodInsight).toContain('4.5/5')
    expect(analytics.hydrationInsight).toContain('6 waters')
  })
})
