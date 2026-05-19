export type HabitIcon =
  | 'book'
  | 'brain'
  | 'bike'
  | 'drop'
  | 'dumbbell'
  | 'heart'
  | 'leaf'
  | 'laundry'
  | 'moon'
  | 'music'
  | 'pencil'
  | 'pill'
  | 'sparkles'
  | 'steps'
  | 'sun'
  | 'utensils'
  | 'coffee'
  | 'shower'

export type HabitFrequency = 'daily' | 'weekly'

/** 0 = Monday, 1 = Tuesday, … 6 = Sunday (matches the app's Monday-start week). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type HabitColor = 'blue' | 'green' | 'coral' | 'gold' | 'violet' | 'gray' | 'teal' | 'pink' | 'indigo' | 'amber' | 'mint'

export interface Habit {
  id: string
  name: string
  icon: HabitIcon
  color: HabitColor
  active: boolean
  frequency: HabitFrequency
  weeklyTarget: number
  weeklyDays: WeekDay[]
  reminderEnabled: boolean
  reminderTime: string
  lastReminderDate?: string
  timerEnabled: boolean
  timerMinutes: number
}

export interface Checkin {
  id: string
  habitId: string
  date: string
}

export interface NotificationPrefs {
  enabled: boolean
  reminderTime: string
  timezone: string
  lastSentDate?: string
}

export interface NewHabitInput {
  name: string
  icon: HabitIcon
  color: HabitColor
  frequency: HabitFrequency
  weeklyTarget: number
  weeklyDays: WeekDay[]
  reminderEnabled: boolean
  reminderTime: string
  timerEnabled: boolean
  timerMinutes: number
}
