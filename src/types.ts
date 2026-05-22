export type HabitIcon =
  // Health & Fitness
  | 'heart' | 'pill' | 'drop' | 'apple' | 'carrot' | 'dumbbell' | 'bike' | 'steps' | 'activity' | 'flame' | 'bed' | 'shield'
  | 'stethoscope' | 'heart-pulse' | 'briefcase-medical' | 'salad' | 'sprout' | 'scale' | 'thermometer' | 'bandage' | 'bone'
  // Mind & Learning
  | 'brain' | 'book' | 'graduation-cap' | 'languages' | 'palette' | 'music' | 'microscope'
  // Productivity & Work
  | 'pencil' | 'pen-tool' | 'briefcase' | 'laptop' | 'calculator' | 'banknote' | 'clock' | 'target'
  // Home & Lifestyle
  | 'home' | 'laundry' | 'shower' | 'brush' | 'shopping-cart' | 'utensils' | 'coffee' | 'hammer' | 'camera' | 'wine'
  // Nature & Travel
  | 'leaf' | 'sun' | 'moon' | 'cloud' | 'plane' | 'compass'
  // General & Motivation
  | 'sparkles' | 'star' | 'zap' | 'flag' | 'award' | 'smile' | 'gift' | 'trophy' | 'gamepad' | 'cat' | 'dog'

export type HabitFrequency = 'daily' | 'weekly'
export type HabitShareLevel = 'private' | 'friends' | 'circles'

/** 0 = Monday, 1 = Tuesday, … 6 = Sunday (matches the app's Monday-start week). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type HabitColor = 'blue' | 'green' | 'coral' | 'gold' | 'violet' | 'gray' | 'teal' | 'pink' | 'indigo' | 'amber' | 'mint' | 'rose' | 'sunset' | 'lavender' | 'turquoise' | 'sky' | 'forest' | 'crimson'

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
  shareLevel: HabitShareLevel
  sharedCircleIds: string[]
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
  wine: number
  softdrink: number
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
  shareLevel: HabitShareLevel
  sharedCircleIds: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  unlocked: boolean
  progressText: string
  sharingText: string
}

export interface FriendProfile {
  uid: string
  displayName: string
  photoURL: string
  friendCode: string
  streak: number
  habitsCount: number
  todayProgress: number
  weeklyProgress: number
  sharedHabitCount: number
  lastMilestone?: string
  lastActive: string
  cheersToday?: number
  isPublic?: boolean
  circleIds?: string[]
}

export type CheerType = 'spark' | 'clap' | 'fire' | 'crown'

export interface Cheer {
  id: string
  fromUid: string
  toUid: string
  fromName: string
  toName?: string
  type: CheerType
  date: string
  createdAt?: unknown
}

export type ActivityEventType = 'checkin' | 'milestone' | 'streak' | 'cheer' | 'nudge' | 'circle-progress'
export type ActivityVisibility = 'self' | 'friends' | 'circles'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  actorUid: string
  actorName: string
  actorPhotoURL?: string
  targetUid?: string
  circleId?: string
  circleName?: string
  habitId?: string
  habitName?: string
  habitIcon?: HabitIcon
  habitColor?: HabitColor
  visibility: ActivityVisibility
  viewerUids: string[]
  circleMemberUids?: string[]
  date: string
  summary: string
  detail?: string
  createdAtMs: number
  createdAt?: unknown
}

export interface CircleMember {
  id: string
  uid: string
  displayName: string
  photoURL: string
  role: 'owner' | 'member'
  weeklyProgress: number
  todayProgress: number
  joinedAt?: unknown
  updatedAt?: unknown
}

export interface Circle {
  id: string
  name: string
  inviteCode: string
  ownerUid: string
  memberUids: string[]
  weeklyGoal: number
  members: CircleMember[]
  createdAt?: unknown
  updatedAt?: unknown
}

export interface CircleInvite {
  id: string
  code: string
  circleId: string
  circleName: string
  ownerUid: string
  active: boolean
  createdAt?: unknown
}

export interface SocialInboxItem {
  id: string
  ownerUid: string
  actorUid: string
  actorName: string
  type: 'cheer' | 'nudge' | 'circle-invite' | 'weekly-summary'
  title: string
  body: string
  read: boolean
  createdAtMs: number
  createdAt?: unknown
}

export interface Nudge {
  id: string
  fromUid: string
  toUid: string
  fromName: string
  toName?: string
  message: string
  type: 'gentle' | 'streak' | 'circle'
  date: string
  createdAtMs: number
  createdAt?: unknown
}
