import type { ActivityEvent, ActivityVisibility, Circle, Habit } from '../types'

export interface HabitActivityEventInput {
  id: string
  actorUid: string
  actorName: string
  actorPhotoURL?: string
  habit: Habit
  date: string
  completedCount: number
  totalHabits: number
  visibility: ActivityVisibility
  viewerUids: string[]
  circleId?: string
  circleName?: string
  circleMemberUids?: string[]
  createdAtMs?: number
}

export function uniqueUids(uids: string[]) {
  return [...new Set(uids.filter(Boolean))]
}

export function habitDetailsAreShared(habit: Pick<Habit, 'shareLevel'>) {
  return habit.shareLevel === 'friends' || habit.shareLevel === 'circles'
}

export function shapeHabitActivityEvent(input: HabitActivityEventInput): Omit<ActivityEvent, 'createdAt'> {
  const detailsShared = habitDetailsAreShared(input.habit)
  const completedCount = Math.max(0, input.completedCount)
  const totalHabits = Math.max(0, input.totalHabits)
  const completedDay = totalHabits > 0 && completedCount >= totalHabits

  return {
    id: input.id,
    type: completedDay ? 'milestone' : 'checkin',
    actorUid: input.actorUid,
    actorName: input.actorName,
    actorPhotoURL: input.actorPhotoURL,
    habitId: detailsShared ? input.habit.id : undefined,
    habitName: detailsShared ? input.habit.name : undefined,
    habitIcon: detailsShared ? input.habit.icon : undefined,
    habitColor: detailsShared ? input.habit.color : undefined,
    visibility: input.visibility,
    viewerUids: uniqueUids(input.viewerUids),
    circleId: input.circleId,
    circleName: input.circleName,
    circleMemberUids: input.circleMemberUids ? uniqueUids(input.circleMemberUids) : undefined,
    date: input.date,
    summary: detailsShared ? `${input.actorName} completed ${input.habit.name}` : `${input.actorName} checked in today`,
    detail: completedDay ? 'Finished the day' : `${completedCount}/${totalHabits || 1} today`,
    createdAtMs: input.createdAtMs ?? Date.now(),
  }
}

export function isCircleMember(circle: Pick<Circle, 'memberUids'>, uid: string) {
  return circle.memberUids.includes(uid)
}

export function getCircleMomentum(circle: Pick<Circle, 'members'>) {
  if (!circle.members.length) return 0
  return Math.round(circle.members.reduce((sum, member) => sum + member.weeklyProgress, 0) / circle.members.length)
}
