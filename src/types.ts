export type HabitIcon =
  // Health & Fitness
  | 'heart' | 'pill' | 'drop' | 'apple' | 'carrot' | 'dumbbell' | 'bike' | 'steps' | 'activity' | 'flame' | 'bed'
  // Mind & Learning
  | 'brain' | 'book' | 'graduation-cap' | 'languages' | 'palette' | 'music' | 'microscope'
  // Productivity & Work
  | 'pencil' | 'pen-tool' | 'briefcase' | 'laptop' | 'calculator' | 'banknote' | 'clock' | 'target'
  // Home & Lifestyle
  | 'home' | 'laundry' | 'shower' | 'brush' | 'shopping-cart' | 'utensils' | 'coffee' | 'hammer' | 'camera'
  // Nature & Travel
  | 'leaf' | 'sun' | 'moon' | 'cloud' | 'plane' | 'compass'
  // General & Motivation
  | 'sparkles' | 'star' | 'zap' | 'flag' | 'award' | 'smile'

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
  sound?: string
  theme?: 'system' | 'light' | 'dark'
  themeColor?: string
}

export type MoodValue = 'terrible' | 'bad' | 'okay' | 'good' | 'great'
export type TimeOfDay = 'morning' | 'evening'

export interface MoodCheckin {
  id: string
  date: string
  timeOfDay: TimeOfDay
  value: MoodValue
}

export interface DrinkCheckin {
  id: string
  date: string
  water: number
  coffee: number
  alcohol: number
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
