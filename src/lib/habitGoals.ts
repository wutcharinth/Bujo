import { getWeekDateKeys } from './dates'
import type { Checkin, Habit, WeekDay } from '../types'

/** Mon-first abbreviations matching the app's week model. */
export const WEEKDAY_LABELS: readonly string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Short single-letter labels for compact display. */
export const WEEKDAY_SHORT: readonly string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function normalizeWeeklyTarget(value: unknown) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 3

  return Math.min(7, Math.max(1, numericValue))
}

export function isWeeklyHabit(habit: Pick<Habit, 'frequency'>) {
  return habit.frequency === 'weekly'
}

export function weeklyDaysLabel(days: WeekDay[]) {
  if (!days.length) return ''
  return days.map((d) => WEEKDAY_LABELS[d]).join(', ')
}

export function getHabitCadenceLabel(habit: Pick<Habit, 'frequency' | 'weeklyTarget' | 'weeklyDays'>) {
  if (!isWeeklyHabit(habit)) return 'Daily'
  const base = `${normalizeWeeklyTarget(habit.weeklyTarget)}x/wk`
  const daysStr = weeklyDaysLabel(habit.weeklyDays ?? [])
  return daysStr ? `${base} · ${daysStr}` : base
}

export function getHabitWeekCount(habitId: string, checkins: Array<Pick<Checkin, 'habitId' | 'date'>>, weekKeys = getWeekDateKeys()) {
  const weekKeySet = new Set(weekKeys)
  return new Set(checkins.filter((checkin) => checkin.habitId === habitId && weekKeySet.has(checkin.date)).map((checkin) => checkin.date)).size
}

export function getHabitGoalProgress(
  habit: Pick<Habit, 'id' | 'frequency' | 'weeklyTarget'>,
  checkins: Array<Pick<Checkin, 'habitId' | 'date'>>,
  todayKey: string,
  weekKeys = getWeekDateKeys(),
) {
  const completedToday = checkins.some((checkin) => checkin.habitId === habit.id && checkin.date === todayKey)
  const weeklyTarget = normalizeWeeklyTarget(habit.weeklyTarget)
  const weekCount = getHabitWeekCount(habit.id, checkins, weekKeys)
  const target = isWeeklyHabit(habit) ? weeklyTarget : 1
  const current = isWeeklyHabit(habit) ? Math.min(weekCount, target) : completedToday ? 1 : 0

  return {
    completedToday,
    current,
    target,
    weekCount,
    onTrack: current >= target,
    label: isWeeklyHabit(habit) ? `${weekCount}/${target} wk` : undefined,
  }
}

export function getWindowGoalStats(
  habits: Array<Pick<Habit, 'id' | 'frequency' | 'weeklyTarget'>>,
  checkins: Array<Pick<Checkin, 'habitId' | 'date'>>,
  dateKeys: string[],
) {
  let completed = 0
  let possible = 0

  for (const habit of habits) {
    if (isWeeklyHabit(habit)) {
      const weekStarts = [...new Set(dateKeys.map((dateKey) => getWeekDateKeys(new Date(`${dateKey}T00:00:00`))[0]))]
      const target = normalizeWeeklyTarget(habit.weeklyTarget)

      for (const weekStart of weekStarts) {
        const weekKeys = getWeekDateKeys(new Date(`${weekStart}T00:00:00`))
        completed += Math.min(target, getHabitWeekCount(habit.id, checkins, weekKeys))
        possible += target
      }
    } else {
      possible += dateKeys.length
      completed += new Set(
        checkins.filter((checkin) => checkin.habitId === habit.id && dateKeys.includes(checkin.date)).map((checkin) => checkin.date),
      ).size
    }
  }

  return { completed, possible, rate: possible ? Math.round((completed / possible) * 100) : 0 }
}
