import { calculateStreaks } from './habitStats'
import { getWindowGoalStats } from './habitGoals'
import type { Checkin, DrinkCheckin, Habit, MoodCheckin } from '../types'

export interface DashboardHabitBreakdown {
  habit: Habit
  recentDone: number
  rate: number
  habitStreak: number
  targetTotal: number
  risk: 'steady' | 'watch' | 'at-risk'
}

export interface DashboardAnalytics {
  currentRate: number
  previousRate: number
  trend: number
  lastThreeRate: number
  perfectDays: number
  consistencyScore: number
  bestDay?: { dateKey: string; rate: number }
  bestWeekday?: { label: string; rate: number }
  weakestWeekday?: { label: string; rate: number }
  habitBreakdown: DashboardHabitBreakdown[]
  strongestHabit?: DashboardHabitBreakdown
  focusHabit?: DashboardHabitBreakdown
  riskHabits: DashboardHabitBreakdown[]
  dashboardMood: 'In flow' | 'Building' | 'Warming up' | 'Empty'
  todayFocus: string
  weeklyReview: string
  moodInsight: string
  hydrationInsight: string
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function doneIdsForDate(checkins: Array<Pick<Checkin, 'habitId' | 'date'>>, dateKey: string) {
  return new Set(checkins.filter((checkin) => checkin.date === dateKey).map((checkin) => checkin.habitId))
}

function moodScore(value: MoodCheckin['value']) {
  return { terrible: 1, bad: 2, okay: 3, good: 4, great: 5 }[value]
}

export function buildDashboardAnalytics({
  activeHabits,
  checkins,
  moods,
  drinks,
  currentSevenKeys,
  previousSevenKeys,
  recentKeys,
  rhythmKeys,
}: {
  activeHabits: Habit[]
  checkins: Array<Pick<Checkin, 'habitId' | 'date'>>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  currentSevenKeys: string[]
  previousSevenKeys: string[]
  recentKeys: string[]
  rhythmKeys: string[]
}): DashboardAnalytics {
  const activeHabitIds = new Set(activeHabits.map((habit) => habit.id))
  const activeCheckins = checkins.filter((checkin) => activeHabitIds.has(checkin.habitId))
  const dayRate = (dateKey: string) => {
    if (!activeHabits.length) return 0
    return Math.round((doneIdsForDate(activeCheckins, dateKey).size / activeHabits.length) * 100)
  }

  const currentStats = getWindowGoalStats(activeHabits, activeCheckins, currentSevenKeys)
  const previousStats = getWindowGoalStats(activeHabits, activeCheckins, previousSevenKeys)
  const currentRate = currentStats.rate
  const previousRate = previousStats.rate
  const trend = currentRate - previousRate
  const lastThreeKeys = recentKeys.slice(-3)
  const lastThreeRate = getWindowGoalStats(activeHabits, activeCheckins, lastThreeKeys).rate
  const perfectDays = currentSevenKeys.filter((dateKey) => {
    const doneThatDay = doneIdsForDate(activeCheckins, dateKey)
    return activeHabits.length > 0 && activeHabits.every((habit) => doneThatDay.has(habit.id))
  }).length

  const bestDay = recentKeys
    .map((dateKey) => ({ dateKey, rate: dayRate(dateKey) }))
    .sort((a, b) => b.rate - a.rate)[0]

  const weekdayStats = weekdayLabels.map((label, index) => {
    const matchingDays = rhythmKeys.filter((dateKey) => {
      const date = new Date(`${dateKey}T00:00:00`)
      const day = date.getDay()
      const mondayFirstIndex = day === 0 ? 6 : day - 1

      return mondayFirstIndex === index
    })
    return { label, rate: getWindowGoalStats(activeHabits, activeCheckins, matchingDays).rate }
  })
  const bestWeekday = [...weekdayStats].sort((a, b) => b.rate - a.rate)[0]
  const weakestWeekday = [...weekdayStats].filter((day) => day.rate > 0).sort((a, b) => a.rate - b.rate)[0]

  const habitBreakdown = activeHabits
    .map((habit) => {
      const habitDates = activeCheckins.filter((checkin) => checkin.habitId === habit.id).map((checkin) => checkin.date)
      const recentDone = recentKeys.filter((dateKey) => habitDates.includes(dateKey)).length
      const habitStats = getWindowGoalStats([habit], activeCheckins, recentKeys)
      const rate = habitStats.rate
      const habitStreak = calculateStreaks(habitDates).current
      const risk: DashboardHabitBreakdown['risk'] = rate < 35 ? 'at-risk' : rate < 70 ? 'watch' : 'steady'

      return { habit, recentDone, rate, habitStreak, targetTotal: habitStats.possible, risk }
    })
    .sort((a, b) => b.rate - a.rate)

  const strongestHabit = habitBreakdown[0]
  const focusHabit = [...habitBreakdown].reverse().find((item) => item.rate < 80) ?? habitBreakdown[habitBreakdown.length - 1]
  const riskHabits = habitBreakdown.filter((item) => item.risk !== 'steady').slice(0, 3)
  const consistencyScore = Math.round((currentRate * 0.65) + (lastThreeRate * 0.25) + (Math.min(perfectDays, 3) / 3) * 10)
  const dashboardMood = currentRate >= 80 ? 'In flow' : currentRate >= 50 ? 'Building' : activeHabits.length ? 'Warming up' : 'Empty'
  const todayFocus = focusHabit
    ? `${focusHabit.habit.name} is the best next check-in. It is at ${focusHabit.rate}% over the last 14 days.`
    : 'Add one tiny habit to start building signal.'
  const weeklyReview = trend >= 10
    ? `Up ${trend} points from last week. Keep the current rhythm.`
    : trend < -10
      ? `Down ${Math.abs(trend)} points from last week. Make the next habit smaller.`
      : 'Your weekly rhythm is steady. Look for one easy win today.'

  const moodDays = moods.filter((mood) => mood.timeOfDay === 'evening')
  const moodInsight = moodDays.length
    ? `Average evening mood ${((moodDays.reduce((sum, mood) => sum + moodScore(mood.value), 0) / moodDays.length)).toFixed(1)}/5.`
    : 'Log evening mood to connect routines with how the day felt.'
  const maxWater = drinks.length ? Math.max(...drinks.map((drink) => drink.water || 0)) : 0
  const hydrationInsight = maxWater >= 5
    ? `Best hydration day hit ${maxWater} waters.`
    : 'Hydration insight appears after a few drink logs.'

  return {
    currentRate,
    previousRate,
    trend,
    lastThreeRate,
    perfectDays,
    consistencyScore,
    bestDay,
    bestWeekday,
    weakestWeekday,
    habitBreakdown,
    strongestHabit,
    focusHabit,
    riskHabits,
    dashboardMood,
    todayFocus,
    weeklyReview,
    moodInsight,
    hydrationInsight,
  }
}

export { doneIdsForDate }
