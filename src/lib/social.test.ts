import { describe, expect, it } from 'vitest'
import { getCircleMomentum, isCircleMember, shapeHabitActivityEvent, uniqueUids } from './social'
import type { Circle, Habit } from '../types'

const baseHabit: Habit = {
  id: 'read',
  name: 'Read',
  icon: 'book',
  color: 'gold',
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
}

describe('social helpers', () => {
  it('keeps private habit activity aggregate-only', () => {
    const event = shapeHabitActivityEvent({
      id: 'event-1',
      actorUid: 'user-1',
      actorName: 'Oui',
      habit: baseHabit,
      date: '2026-05-22',
      completedCount: 1,
      totalHabits: 3,
      visibility: 'friends',
      viewerUids: ['user-1', 'friend-1'],
      createdAtMs: 10,
    })

    expect(event.summary).toBe('Oui checked in today')
    expect(event.habitName).toBeUndefined()
    expect(event.habitIcon).toBeUndefined()
    expect(event.habitColor).toBeUndefined()
  })

  it('includes habit details when the habit is shared', () => {
    const event = shapeHabitActivityEvent({
      id: 'event-2',
      actorUid: 'user-1',
      actorName: 'Oui',
      habit: { ...baseHabit, shareLevel: 'friends' },
      date: '2026-05-22',
      completedCount: 2,
      totalHabits: 2,
      visibility: 'friends',
      viewerUids: ['friend-1', 'friend-1', 'user-1'],
      createdAtMs: 10,
    })

    expect(event.summary).toBe('Oui completed Read')
    expect(event.type).toBe('milestone')
    expect(event.habitName).toBe('Read')
    expect(event.viewerUids).toEqual(['friend-1', 'user-1'])
  })

  it('calculates circle membership and momentum', () => {
    const circle: Circle = {
      id: 'circle-1',
      name: 'Weekend reset',
      inviteCode: 'RESET',
      ownerUid: 'user-1',
      memberUids: ['user-1', 'friend-1'],
      weeklyGoal: 70,
      members: [
        { id: 'user-1', uid: 'user-1', displayName: 'Oui', photoURL: '', role: 'owner', weeklyProgress: 80, todayProgress: 50 },
        { id: 'friend-1', uid: 'friend-1', displayName: 'Pat', photoURL: '', role: 'member', weeklyProgress: 40, todayProgress: 20 },
      ],
    }

    expect(isCircleMember(circle, 'friend-1')).toBe(true)
    expect(isCircleMember(circle, 'outsider')).toBe(false)
    expect(getCircleMomentum(circle)).toBe(60)
    expect(uniqueUids(['a', '', 'a', 'b'])).toEqual(['a', 'b'])
  })
})
