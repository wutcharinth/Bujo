import { countConsecutiveDays, getBestStreak, getWeekDateKeys } from './dates'

export function calculateStreaks(dateKeys: Iterable<string>, anchor = new Date()) {
  const uniqueKeys = new Set(dateKeys)

  return {
    current: countConsecutiveDays(uniqueKeys, anchor),
    best: getBestStreak(uniqueKeys),
    total: uniqueKeys.size,
  }
}

export function getWeeklyProgress(dateKeys: Iterable<string>, anchor = new Date()) {
  const completed = new Set(dateKeys)

  return getWeekDateKeys(anchor).map((dateKey) => ({
    dateKey,
    completed: completed.has(dateKey),
  }))
}
