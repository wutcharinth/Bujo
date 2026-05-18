import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'

export const DATE_KEY_FORMAT = 'yyyy-MM-dd'

export function getDateKey(date = new Date()) {
  return format(date, DATE_KEY_FORMAT)
}

export function dateFromKey(dateKey: string) {
  return parseISO(`${dateKey}T00:00:00`)
}

export function addDaysToKey(dateKey: string, amount: number) {
  return getDateKey(addDays(dateFromKey(dateKey), amount))
}

export function getWeekDateKeys(anchor = new Date()) {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, index) => getDateKey(addDays(monday, index)))
}

export function getRecentDateKeys(days: number, anchor = new Date()) {
  const end = getDateKey(anchor)
  return Array.from({ length: days }, (_, index) => addDaysToKey(end, index - days + 1))
}

export function countConsecutiveDays(dateKeys: Iterable<string>, anchor = new Date()) {
  const completed = new Set(dateKeys)
  let cursor = getDateKey(anchor)
  let streak = 0

  while (completed.has(cursor)) {
    streak += 1
    cursor = addDaysToKey(cursor, -1)
  }

  return streak
}

export function getBestStreak(dateKeys: Iterable<string>) {
  const sortedKeys = [...new Set(dateKeys)].sort()
  let best = 0
  let run = 0
  let previous: string | null = null

  for (const key of sortedKeys) {
    if (!previous || differenceInCalendarDays(dateFromKey(key), dateFromKey(previous)) === 1) {
      run += 1
    } else {
      run = 1
    }

    best = Math.max(best, run)
    previous = key
  }

  return best
}
