import { describe, expect, it } from 'vitest'
import { addDaysToKey, countConsecutiveDays, getBestStreak, getRecentDateKeys, getWeekDateKeys } from './dates'
import { calculateStreaks, getWeeklyProgress } from './habitStats'

describe('date helpers', () => {
  it('adds days to local date keys', () => {
    expect(addDaysToKey('2026-05-18', 1)).toBe('2026-05-19')
    expect(addDaysToKey('2026-05-18', -7)).toBe('2026-05-11')
  })

  it('returns a Monday-first week', () => {
    expect(getWeekDateKeys(new Date('2026-05-18T12:00:00'))).toEqual([
      '2026-05-18',
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
    ])
  })

  it('creates recent date windows ending at the anchor', () => {
    expect(getRecentDateKeys(3, new Date('2026-05-18T12:00:00'))).toEqual([
      '2026-05-16',
      '2026-05-17',
      '2026-05-18',
    ])
  })
})

describe('habit streaks', () => {
  it('counts the current streak backward from today', () => {
    expect(
      countConsecutiveDays(['2026-05-18', '2026-05-17', '2026-05-15'], new Date('2026-05-18T12:00:00')),
    ).toBe(2)
  })

  it('finds the best streak across completed days', () => {
    expect(getBestStreak(['2026-05-10', '2026-05-11', '2026-05-14', '2026-05-15', '2026-05-16'])).toBe(3)
  })

  it('summarizes current, best, and total streak metrics', () => {
    expect(calculateStreaks(['2026-05-16', '2026-05-17', '2026-05-18'], new Date('2026-05-18T12:00:00'))).toEqual({
      current: 3,
      best: 3,
      total: 3,
    })
  })

  it('marks weekly progress for completed dates', () => {
    expect(getWeeklyProgress(['2026-05-18', '2026-05-20'], new Date('2026-05-18T12:00:00'))).toEqual([
      { dateKey: '2026-05-18', completed: true },
      { dateKey: '2026-05-19', completed: false },
      { dateKey: '2026-05-20', completed: true },
      { dateKey: '2026-05-21', completed: false },
      { dateKey: '2026-05-22', completed: false },
      { dateKey: '2026-05-23', completed: false },
      { dateKey: '2026-05-24', completed: false },
    ])
  })
})
