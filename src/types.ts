export type HabitIcon =
  | 'book'
  | 'drop'
  | 'dumbbell'
  | 'heart'
  | 'leaf'
  | 'moon'
  | 'pencil'
  | 'sparkles'
  | 'steps'
  | 'sun'

export type HabitColor = 'blue' | 'green' | 'coral' | 'gold' | 'violet' | 'gray'

export interface Habit {
  id: string
  name: string
  icon: HabitIcon
  color: HabitColor
  active: boolean
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
  reminderEnabled: boolean
  reminderTime: string
  timerEnabled: boolean
  timerMinutes: number
}
