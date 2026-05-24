import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BarChart3,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudRain,
  Frown,
  Home,
  Info,
  Laugh,
  LogOut,
  Meh,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Timer,
  X,
  Beer,
  GlassWater,
  CupSoda,
  // Health & Fitness
  Heart,
  Pill,
  Droplets,
  Apple,
  Carrot,
  Dumbbell,
  Bike,
  Footprints,
  Activity,
  Flame,
  Bed,
  Shield,
  Stethoscope,
  HeartPulse,
  BriefcaseMedical,
  Salad,
  Sprout,
  Scale,
  Thermometer,
  Bandage,
  Bone,
  // Mind & Learning
  Brain,
  BookOpen,
  GraduationCap,
  Languages,
  Palette,
  Music,
  Microscope,
  // Productivity & Work
  Pencil,
  PenTool,
  Briefcase,
  Laptop,
  Calculator,
  Banknote,
  Clock,
  Target,
  // Home & Lifestyle
  WashingMachine,
  ShowerHead,
  Brush,
  ShoppingCart,
  Utensils,
  Coffee,
  Hammer,
  Camera,
  Wine,
  // Nature & Travel
  Leaf,
  Sun,
  Moon,
  Cloud,
  Plane,
  Compass,
  // General & Motivation
  Sparkles,
  Star,
  Zap,
  Flag,
  Award,
  Smile,
  Gift,
  Trophy,
  Gamepad2,
  Cat,
  Dog,
  Inbox,
  Send,
  Share,
  Copy,
  Users,
  UserPlus,
  UserMinus,
  PartyPopper,
  Crown,
  Medal,
  Lock,
  Unlock,
  QrCode,
  Video,
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useBujoData } from './hooks/useBujoData'
import { useFriends } from './hooks/useFriends'
import { dateFromKey, getDateKey, getRecentDateKeys, getWeekDateKeys } from './lib/dates'
import { getHabitCadenceLabel, getHabitGoalProgress, getWindowGoalStats, isWeeklyHabit, normalizeWeeklyTarget, WEEKDAY_SHORT } from './lib/habitGoals'
import { calculateStreaks } from './lib/habitStats'
import { getNotificationHelpText, requestPushToken } from './lib/notifications'
import { getUserTimeZone } from './lib/reminders'
import { buildDashboardAnalytics, doneIdsForDate as getDoneIdsForDate } from './lib/dashboardAnalytics'
import { getCircleMomentum } from './lib/social'
import type { Achievement, ActivityEvent, Cheer, CheerType, Circle, DailyMemory, DrinkCheckin, FriendProfile, Habit, HabitColor, HabitIcon, MoodCheckin, MoodValue, NewHabitInput, NotificationPrefs, SocialInboxItem, TimeOfDay, WeekDay } from './types'

type TabId = 'today' | 'habits' | 'progress' | 'achievements' | 'friends' | 'settings'
type CSSVariableProperties = CSSProperties & Record<`--${string}`, string | number>

const habitIcons: Record<HabitIcon, LucideIcon> = {
  // Health & Fitness
  heart: Heart,
  pill: Pill,
  drop: Droplets,
  apple: Apple,
  carrot: Carrot,
  dumbbell: Dumbbell,
  bike: Bike,
  steps: Footprints,
  activity: Activity,
  flame: Flame,
  bed: Bed,
  shield: Shield,
  stethoscope: Stethoscope,
  'heart-pulse': HeartPulse,
  'briefcase-medical': BriefcaseMedical,
  salad: Salad,
  sprout: Sprout,
  scale: Scale,
  thermometer: Thermometer,
  bandage: Bandage,
  bone: Bone,

  // Mind & Learning
  brain: Brain,
  book: BookOpen,
  'graduation-cap': GraduationCap,
  languages: Languages,
  palette: Palette,
  music: Music,
  microscope: Microscope,

  // Productivity & Work
  pencil: Pencil,
  'pen-tool': PenTool,
  briefcase: Briefcase,
  laptop: Laptop,
  calculator: Calculator,
  banknote: Banknote,
  clock: Clock,
  target: Target,

  // Home & Lifestyle
  home: Home,
  laundry: WashingMachine,
  shower: ShowerHead,
  brush: Brush,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  coffee: Coffee,
  hammer: Hammer,
  camera: Camera,
  wine: Wine,

  // Nature & Travel
  leaf: Leaf,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  plane: Plane,
  compass: Compass,

  // General & Motivation
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
  flag: Flag,
  award: Award,
  smile: Smile,
  gift: Gift,
  trophy: Trophy,
  gamepad: Gamepad2,
  cat: Cat,
  dog: Dog,
}

const iconTags: Record<HabitIcon, string[]> = {
  // Health & Fitness
  heart: ['love', 'cardio', 'health', 'pulse', 'care', 'fitness'],
  pill: ['medicine', 'vitamin', 'supplement', 'drug', 'health', 'sick'],
  drop: ['water', 'hydration', 'fluid', 'drink', 'liquid', 'sweat', 'health'],
  apple: ['fruit', 'food', 'healthy', 'diet', 'eating', 'snack'],
  carrot: ['vegetable', 'healthy', 'diet', 'eating', 'food', 'vision'],
  dumbbell: ['gym', 'workout', 'weight', 'lift', 'strength', 'fitness', 'exercise'],
  bike: ['cycle', 'ride', 'cardio', 'workout', 'fitness', 'exercise', 'outdoor'],
  steps: ['walk', 'run', 'cardio', 'movement', 'footprints', 'tracking'],
  activity: ['pulse', 'rate', 'heart', 'cardio', 'health', 'sports'],
  flame: ['calories', 'burn', 'streak', 'energy', 'hot', 'motivation'],
  bed: ['sleep', 'rest', 'nap', 'bedtime', 'recovery', 'night'],
  shield: ['protect', 'safety', 'health', 'secure', 'defense', 'habits'],
  stethoscope: ['doctor', 'checkup', 'clinic', 'medical', 'heart', 'health'],
  'heart-pulse': ['heartbeat', 'cardio', 'pulse', 'ekg', 'gym', 'health'],
  'briefcase-medical': ['first-aid', 'doctor', 'kit', 'medicine', 'health', 'care'],
  salad: ['healthy', 'eating', 'diet', 'vegan', 'greens', 'food'],
  sprout: ['grow', 'plant', 'nature', 'health', 'organic', 'new'],
  scale: ['weight', 'mass', 'fitness', 'diet', 'progress', 'body'],
  thermometer: ['fever', 'temperature', 'sick', 'health', 'weather'],
  bandage: ['injury', 'wound', 'heal', 'care', 'first-aid', 'recovery'],
  bone: ['calcium', 'skeleton', 'joints', 'strength', 'supplements'],

  // Mind & Learning
  brain: ['think', 'mind', 'mental', 'learn', 'study', 'focus', 'idea'],
  book: ['read', 'study', 'learn', 'education', 'knowledge', 'relax'],
  'graduation-cap': ['school', 'university', 'degree', 'education', 'learn', 'smart'],
  languages: ['translate', 'speak', 'study', 'words', 'learn', 'talk'],
  palette: ['art', 'paint', 'draw', 'creative', 'design', 'hobby'],
  music: ['song', 'instrument', 'relax', 'play', 'sing', 'sound'],
  microscope: ['science', 'research', 'lab', 'study', 'learn', 'test'],

  // Productivity & Work
  pencil: ['write', 'draw', 'journal', 'note', 'creative', 'work'],
  'pen-tool': ['design', 'vector', 'art', 'creative', 'draw', 'work'],
  briefcase: ['work', 'job', 'business', 'office', 'career'],
  laptop: ['computer', 'work', 'code', 'type', 'screen', 'tech'],
  calculator: ['math', 'numbers', 'finance', 'budget', 'work', 'accounting'],
  banknote: ['money', 'cash', 'save', 'spend', 'finance', 'budget'],
  clock: ['time', 'timer', 'schedule', 'duration', 'routine'],
  target: ['goal', 'focus', 'aim', 'achieve', 'task', 'mission'],

  // Home & Lifestyle
  home: ['house', 'family', 'indoor', 'clean', 'room'],
  laundry: ['wash', 'clothes', 'clean', 'chore', 'laundry'],
  shower: ['clean', 'wash', 'bath', 'hygiene', 'morning', 'fresh'],
  brush: ['teeth', 'dentist', 'clean', 'hygiene', 'morning', 'paint'],
  'shopping-cart': ['buy', 'store', 'groceries', 'shop', 'spend'],
  utensils: ['eat', 'food', 'meal', 'dinner', 'cooking', 'restaurant'],
  coffee: ['caffeine', 'morning', 'drink', 'cup', 'energy', 'tea'],
  hammer: ['build', 'fix', 'tool', 'repair', 'diy', 'construct'],
  camera: ['photo', 'picture', 'memory', 'capture', 'hobby'],
  wine: ['drink', 'alcohol', 'relax', 'evening', 'party', 'bar'],

  // Nature & Travel
  leaf: ['green', 'nature', 'sprout', 'organic', 'eco', 'plant'],
  sun: ['day', 'morning', 'light', 'warm', 'outside', 'weather'],
  moon: ['night', 'sleep', 'evening', 'dark', 'sky'],
  cloud: ['weather', 'sky', 'relax', 'nature', 'rain'],
  plane: ['travel', 'fly', 'flight', 'trip', 'vacation', 'holiday'],
  compass: ['direction', 'explore', 'map', 'outdoor', 'adventure', 'travel'],

  // General & Motivation
  sparkles: ['magic', 'clean', 'new', 'star', 'special', 'motivation'],
  star: ['fave', 'favorite', 'rating', 'win', 'shine', 'points'],
  zap: ['energy', 'lightning', 'quick', 'power', 'fast', 'motivation'],
  flag: ['start', 'finish', 'milestone', 'destination', 'achievement'],
  award: ['prize', 'trophy', 'win', 'achievement', 'first'],
  smile: ['happy', 'mood', 'joy', 'friendly', 'positivity'],
  gift: ['present', 'reward', 'treat', 'birthday', 'surprise'],
  trophy: ['win', 'prize', 'champion', 'first', 'award', 'achievement'],
  gamepad: ['game', 'play', 'fun', 'console', 'relax', 'hobby'],
  cat: ['pet', 'animal', 'kitten', 'meow', 'cute'],
  dog: ['pet', 'animal', 'puppy', 'walk', 'cute'],
}

const colorNames: Record<HabitColor, string> = {
  blue: 'Blue',
  green: 'Green',
  coral: 'Coral',
  gold: 'Gold',
  violet: 'Violet',
  gray: 'Gray',
  teal: 'Teal',
  pink: 'Pink',
  indigo: 'Indigo',
  amber: 'Amber',
  mint: 'Mint',
  rose: 'Rose',
  sunset: 'Sunset',
  lavender: 'Lavender',
  turquoise: 'Turquoise',
  sky: 'Sky',
  forest: 'Forest',
  crimson: 'Crimson',
}

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'habits', label: 'Habits', icon: Check },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'friends', label: 'Friends', icon: Users },
]

const cheerActions: Array<{ type: CheerType; label: string; icon: LucideIcon }> = [
  { type: 'spark', label: 'Spark', icon: Sparkles },
  { type: 'clap', label: 'Bravo', icon: PartyPopper },
  { type: 'fire', label: 'Fire', icon: Flame },
  { type: 'crown', label: 'Crown', icon: Crown },
]

function getCheerAction(type: CheerType) {
  return cheerActions.find((action) => action.type === type) ?? cheerActions[0]
}

function getActivityMeta(lastActive: string) {
  if (!lastActive) return { label: 'No activity yet', tone: 'quiet', daysAgo: 999 }

  const daysAgo = differenceInCalendarDays(new Date(), dateFromKey(lastActive))

  if (daysAgo <= 0) return { label: 'Active today', tone: 'fresh', daysAgo }
  if (daysAgo === 1) return { label: 'Active yesterday', tone: 'warm', daysAgo }
  if (daysAgo <= 7) return { label: `${daysAgo}d ago`, tone: 'warm', daysAgo }

  return { label: 'Quiet lately', tone: 'quiet', daysAgo }
}

const defaultHabit: NewHabitInput = {
  name: '',
  icon: 'sparkles',
  color: 'blue',
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

function habitToInput(habit: Habit | null): NewHabitInput {
  if (!habit) {
    return { ...defaultHabit }
  }

  return {
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    frequency: habit.frequency,
    weeklyTarget: habit.weeklyTarget,
    weeklyDays: habit.weeklyDays ?? [],
    reminderEnabled: habit.reminderEnabled,
    reminderTime: habit.reminderTime,
    timerEnabled: habit.timerEnabled,
    timerMinutes: habit.timerMinutes,
    shareLevel: habit.shareLevel ?? 'private',
    sharedCircleIds: habit.sharedCircleIds ?? [],
  }
}

interface ActiveTimer {
  habitId: string
  habitName: string
  color: HabitColor
  durationSeconds: number
  accumulatedSeconds: number
  startTime: number | null
  isRunning: boolean
  remainingSeconds: number
}

function App() {
  const authState = useAuth()

  if (authState.loading) {
    return <SplashScreen />
  }

  if (!authState.hasFirebaseConfig) {
    return <ConfigScreen />
  }

  if (!authState.user) {
    return <SignInScreen error={authState.error} onSignIn={authState.signIn} />
  }

  return <BujoHome authState={authState} />
}

function BujoHome({ authState }: { authState: ReturnType<typeof useAuth> }) {
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [oauthPlatform, setOauthPlatform] = useState<'instagram' | 'facebook' | 'tiktok' | null>(null)
  const bujo = useBujoData(authState.user)
  const social = useFriends(authState.user)

  const handleConnectSocial = useCallback(
    async (platform: 'instagram' | 'facebook' | 'tiktok', connect: boolean) => {
      if (!connect) {
        const key = platform === 'instagram' 
          ? 'socialConnectedInstagram' 
          : platform === 'tiktok' 
            ? 'socialConnectedTiktok' 
            : 'socialConnectedFacebook'
        await bujo.saveNotificationPrefs({ [key]: false })
        setNotice(`Disconnected from ${platform.charAt(0).toUpperCase() + platform.slice(1)}.`)
        return
      }
      setOauthPlatform(platform)
    },
    [bujo],
  )
  const { publishHabitActivity, syncMyProfile } = social
  const todayKey = getDateKey()
  const currentWeekKeys = useMemo(() => getWeekDateKeys(), [])

  useEffect(() => {
    const theme = bujo.prefs.theme || 'system'
    const color = bujo.prefs.themeColor || '#2878ff'

    if (theme !== 'system') {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    document.documentElement.style.setProperty('--theme-color', color)

    // Update meta theme-color so mobile top status bar matches the background
    setTimeout(() => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
      if (bg) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]')
        if (!metaThemeColor) {
          metaThemeColor = document.createElement('meta')
          metaThemeColor.setAttribute('name', 'theme-color')
          document.head.appendChild(metaThemeColor)
        }
        metaThemeColor.setAttribute('content', bg)
      }
    }, 50)
  }, [bujo.prefs.theme, bujo.prefs.themeColor])

  const completedToday = useMemo(
    () => new Set(bujo.checkins.filter((checkin) => checkin.date === todayKey).map((checkin) => checkin.habitId)),
    [bujo.checkins, todayKey],
  )

  const allCheckinDates = useMemo(() => bujo.checkins.map((checkin) => checkin.date), [bujo.checkins])
  const appStreaks = useMemo(() => calculateStreaks(allCheckinDates), [allCheckinDates])
  const currentStreak = appStreaks.current
  const onTrackCount = useMemo(
    () =>
      bujo.activeHabits.filter((habit) => getHabitGoalProgress(habit, bujo.checkins, todayKey, currentWeekKeys).onTrack)
        .length,
    [bujo.activeHabits, bujo.checkins, currentWeekKeys, todayKey],
  )
  const progress = bujo.activeHabits.length ? onTrackCount / bujo.activeHabits.length : 0
  const weeklyProgress = useMemo(
    () => getWindowGoalStats(bujo.activeHabits, bujo.checkins, currentWeekKeys).rate,
    [bujo.activeHabits, bujo.checkins, currentWeekKeys],
  )
  const sharedHabitCount = useMemo(
    () => bujo.activeHabits.filter((habit) => habit.shareLevel !== 'private').length,
    [bujo.activeHabits],
  )
  const socialInsights = useMemo(() => {
    const circleMomentum = social.circles.length
      ? Math.round(social.circles.reduce((sum, circle) => sum + getCircleMomentum(circle), 0) / social.circles.length)
      : 0

    return {
      activeFriendsToday: social.friends.filter((friend) => friend.lastActive === todayKey).length,
      circleCount: social.circles.length,
      circleMomentum,
      cheersReceivedToday: social.cheersReceivedToday,
      unreadCount: social.unreadCount,
    }
  }, [social.cheersReceivedToday, social.circles, social.friends, social.unreadCount, todayKey])
  const greetingName = authState.user?.displayName?.split(' ')[0] ?? 'there'

  // Sync public profile for friends feature
  useEffect(() => {
    if (!bujo.loading) {
      syncMyProfile({
        streak: currentStreak,
        habitsCount: bujo.activeHabits.length,
        todayProgress: progress,
        weeklyProgress,
        sharedHabitCount,
        lastMilestone: currentStreak >= 7 ? `${currentStreak} day streak` : undefined,
      })
    }
  }, [currentStreak, bujo.activeHabits.length, progress, bujo.loading, weeklyProgress, sharedHabitCount, syncMyProfile])

  const openCreateSheet = () => {
    setEditingHabit(null)
    setIsSheetOpen(true)
  }

  const openEditSheet = (habit: Habit) => {
    setEditingHabit(habit)
    setIsSheetOpen(true)
  }

  const handleHabitSave = async (input: NewHabitInput) => {
    if (editingHabit) {
      await bujo.updateHabit(editingHabit.id, input)
    } else {
      await bujo.addHabit(input)
    }

    setIsSheetOpen(false)
    setEditingHabit(null)
  }

  const handleToggleHabit = useCallback(
    async (habit: Habit, completed: boolean) => {
      await bujo.toggleToday(habit.id, completed)

      if (completed) return

      const nextCompletedCount = completedToday.has(habit.id) ? completedToday.size : completedToday.size + 1
      await publishHabitActivity(habit, {
        completedCount: nextCompletedCount,
        totalHabits: bujo.activeHabits.length,
        currentStreak,
        todayProgress: bujo.activeHabits.length ? Math.round((nextCompletedCount / bujo.activeHabits.length) * 100) : 0,
        weeklyProgress,
      })
    },
    [bujo, completedToday, currentStreak, publishHabitActivity, weeklyProgress],
  )

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Bujo</p>
          <h1>{activeTab === 'today' ? `Hi, ${greetingName}` : tabTitle(activeTab)}</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Open settings" onClick={() => setActiveTab('settings')}>
          <Settings size={21} />
        </button>
      </header>

      {notice && (
        <button className="notice" type="button" onClick={() => setNotice(null)}>
          <Info size={17} />
          <span>{notice}</span>
          <X size={17} />
        </button>
      )}

      <main>
        {bujo.error && <InlineMessage tone="warning" message={bujo.error} />}
        {bujo.loading ? (
          <LoadingPanel />
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayView
                activeHabits={bujo.activeHabits}
                checkins={bujo.checkins}
                moods={bujo.moods}
                drinks={bujo.drinks}
                completedToday={completedToday}
                progress={progress}
                streak={currentStreak}
                onTrackCount={onTrackCount}
                onAddHabit={openCreateSheet}
                onToggle={handleToggleHabit}
                onSetMood={bujo.setMood}
                onUpdateDrink={bujo.updateDrinkCount}
                memories={bujo.memories}
                onSetMemory={bujo.setMemory}
              />
            )}
            {activeTab === 'habits' && (
              <HabitsView
                habits={bujo.habits}
                onAddHabit={openCreateSheet}
                onArchive={bujo.archiveHabit}
                onEdit={openEditSheet}
              />
            )}
            {activeTab === 'progress' && (
              <ProgressView
                activeHabits={bujo.activeHabits}
                checkins={bujo.checkins}
                moods={bujo.moods}
                drinks={bujo.drinks}
                memories={bujo.memories}
                streaks={appStreaks}
                socialInsights={socialInsights}
                prefs={bujo.prefs}
                onToggle={(habitId, completed, date) => bujo.toggleToday(habitId, completed, date)}
                onSetMood={(timeOfDay, value, date) => bujo.setMood(timeOfDay, value, date)}
                onUpdateDrink={(type, delta, date) => bujo.updateDrinkCount(type, delta, date)}
                onSetMemory={(text, date) => bujo.setMemory(text, date)}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementsView
                activeHabits={bujo.activeHabits}
                checkins={bujo.checkins}
                moods={bujo.moods}
                drinks={bujo.drinks}
                memories={bujo.memories}
                prefs={bujo.prefs}
                currentStreak={currentStreak}
                circles={social.circles}
                friends={social.friends}
                cheersSent={social.cheersSent}
                cheersReceived={social.cheersReceived}
              />
            )}
            {activeTab === 'friends' && (
              <FriendsView
                myProfile={social.myProfile}
                friends={social.friends}
                loading={social.loading}
                activityEvents={social.activityEvents}
                circles={social.circles}
                inboxItems={social.inboxItems}
                unreadCount={social.unreadCount}
                cheersSentToday={social.cheersSentToday}
                cheersReceivedToday={social.cheersReceivedToday}
                cheersSent={social.cheersSent}
                cheersReceived={social.cheersReceived}
                onFollow={social.followByCode}
                onUnfollow={social.unfollow}
                onSendCheer={social.sendCheer}
                onSendNudge={social.sendNudge}
                onTogglePrivacy={social.togglePrivacy}
                onCreateCircle={social.createCircle}
                onJoinCircle={social.joinCircleByCode}
                onLeaveCircle={social.leaveCircle}
                onMarkInboxItemRead={social.markInboxItemRead}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView
                photoURL={authState.user?.photoURL}
                displayName={authState.user?.displayName}
                email={authState.user?.email}
                prefs={bujo.prefs}
                onEnableReminders={async () => {
                  const result = await requestPushToken()

                  if (result.status === 'granted') {
                    await bujo.saveFcmToken(result.token)
                    await bujo.saveNotificationPrefs({
                      enabled: true,
                      timezone: getUserTimeZone(),
                    })
                    setNotice('Device reminders are on. Each habit controls its own reminder time.')
                    return
                  }

                  await bujo.saveNotificationPrefs({ enabled: false })
                  setNotice(result.message)
                }}
                onDisableReminders={async () => {
                  await bujo.saveNotificationPrefs({ enabled: false })
                  setNotice('Device reminders are off. Habit reminder times are still saved.')
                }}
                onSavePrefs={bujo.saveNotificationPrefs}
                onConnectSocial={handleConnectSocial}
                onSignOut={authState.signOut}
              />
            )}
          </>
        )}
      </main>

      <nav className="tab-bar" aria-label="Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={tab.id === activeTab ? 'tab-item active' : 'tab-item'}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={tab.id === activeTab ? 'page' : undefined}
            >
              <Icon size={22} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {isSheetOpen && (
        <HabitSheet
          key={editingHabit?.id ?? 'new-habit'}
          habit={editingHabit}
          circles={social.circles}
          onClose={() => {
            setIsSheetOpen(false)
            setEditingHabit(null)
          }}
          onSave={handleHabitSave}
        />
      )}

      {oauthPlatform && (
        <SimulatedOauthModal
          platform={oauthPlatform}
          onClose={() => setOauthPlatform(null)}
          onAuthorize={async () => {
            const key = oauthPlatform === 'instagram' 
              ? 'socialConnectedInstagram' 
              : oauthPlatform === 'tiktok' 
                ? 'socialConnectedTiktok' 
                : 'socialConnectedFacebook'
            await bujo.saveNotificationPrefs({ [key]: true })
            setOauthPlatform(null)
            setNotice(`Successfully connected to ${oauthPlatform.charAt(0).toUpperCase() + oauthPlatform.slice(1)}!`)
          }}
        />
      )}
    </div>
  )
}

function MoodTracker({
  moods,
  onSetMood,
}: {
  moods: MoodCheckin[]
  onSetMood: (timeOfDay: TimeOfDay, value: MoodValue | null) => void
}) {
  const todayKey = getDateKey()
  const todaysMoods = moods.filter((m) => m.date === todayKey)
  const morningMood = todaysMoods.find((m) => m.timeOfDay === 'morning')?.value
  const eveningMood = todaysMoods.find((m) => m.timeOfDay === 'evening')?.value

  const moodOptions: Array<{ value: MoodValue; icon: React.ReactNode; label: string }> = [
    { value: 'terrible', icon: <CloudRain size={20} />, label: 'Terrible' },
    { value: 'bad', icon: <Frown size={20} />, label: 'Bad' },
    { value: 'okay', icon: <Meh size={20} />, label: 'Okay' },
    { value: 'good', icon: <Smile size={20} />, label: 'Good' },
    { value: 'great', icon: <Laugh size={20} />, label: 'Great' },
  ]

  return (
    <div className="panel-section">
      <div className="section-heading">
        <h2>Mood</h2>
      </div>
      <div className="mood-tracker">
        <div className="mood-row">
          <span>Sleep</span>
          <div className="mood-options">
            {moodOptions.map((opt) => (
                <button
                key={`morning-${opt.value}`}
                type="button"
                className={`mood-btn ${morningMood === opt.value ? 'active' : ''}`}
                onClick={() => onSetMood('morning', morningMood === opt.value ? null : opt.value)}
                aria-label={opt.label}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
        <div className="mood-row">
          <span>Day</span>
          <div className="mood-options">
            {moodOptions.map((opt) => (
              <button
                key={`evening-${opt.value}`}
                type="button"
                className={`mood-btn ${eveningMood === opt.value ? 'active' : ''}`}
                onClick={() => onSetMood('evening', eveningMood === opt.value ? null : opt.value)}
                aria-label={opt.label}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DrinksTracker({
  drinks,
  onUpdateDrink,
}: {
  drinks: DrinkCheckin[]
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink', delta: number) => Promise<void>
}) {
  const todayKey = getDateKey()
  const todaysDrinks = drinks.find((d) => d.date === todayKey) || { water: 0, coffee: 0, alcohol: 0, wine: 0, softdrink: 0 }

  const handleContext = (e: React.MouseEvent, type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink') => {
    e.preventDefault()
    onUpdateDrink(type, -1)
  }

  return (
    <div className="panel-section">
      <div className="section-heading">
        <h2>Drinks</h2>
      </div>
      <div className="drinks-tracker">
        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('water', 1)}
          onContextMenu={(e) => handleContext(e, 'water')}
          aria-label="Water"
        >
          <div className="drink-icon water"><GlassWater size={22} /></div>
          {todaysDrinks.water > 0 && <span className="drink-badge">{todaysDrinks.water}</span>}
        </button>

        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('coffee', 1)}
          onContextMenu={(e) => handleContext(e, 'coffee')}
          aria-label="Coffee"
        >
          <div className="drink-icon coffee"><Coffee size={22} /></div>
          {todaysDrinks.coffee > 0 && <span className="drink-badge">{todaysDrinks.coffee}</span>}
        </button>

        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('softdrink', 1)}
          onContextMenu={(e) => handleContext(e, 'softdrink')}
          aria-label="Soft drink"
        >
          <div className="drink-icon softdrink"><CupSoda size={22} /></div>
          {(todaysDrinks.softdrink ?? 0) > 0 && <span className="drink-badge">{todaysDrinks.softdrink}</span>}
        </button>

        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('wine', 1)}
          onContextMenu={(e) => handleContext(e, 'wine')}
          aria-label="Wine"
        >
          <div className="drink-icon wine"><Wine size={22} /></div>
          {(todaysDrinks.wine ?? 0) > 0 && <span className="drink-badge">{todaysDrinks.wine}</span>}
        </button>

        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('alcohol', 1)}
          onContextMenu={(e) => handleContext(e, 'alcohol')}
          aria-label="Beer / Alcohol"
        >
          <div className="drink-icon alcohol"><Beer size={22} /></div>
          {todaysDrinks.alcohol > 0 && <span className="drink-badge">{todaysDrinks.alcohol}</span>}
        </button>
      </div>
    </div>
  )
}

function TodayView({
  activeHabits,
  checkins,
  moods,
  drinks,
  completedToday,
  progress,
  streak,
  onTrackCount,
  onAddHabit,
  onToggle,
  onSetMood,
  onUpdateDrink,
  memories,
  onSetMemory,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  completedToday: Set<string>
  progress: number
  streak: number
  onTrackCount: number
  onAddHabit: () => void
  onToggle: (habit: Habit, completed: boolean) => Promise<void>
  onSetMood: (timeOfDay: TimeOfDay, value: MoodValue | null) => Promise<void>
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink', delta: number) => Promise<void>
  memories: DailyMemory[]
  onSetMemory: (text: string) => Promise<void>
}) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [showTodayShare, setShowTodayShare] = useState(false)
  const completedCount = completedToday.size
  const progressPercent = Math.round(progress * 100)
  const weekKeys = useMemo(() => getWeekDateKeys(), [])

  // Load saved timer from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bujo_active_timer')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object' && parsed.habitId) {
          setActiveTimer(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to load active timer', e)
    }
  }, [])

  // Save timer to localStorage on state change
  useEffect(() => {
    try {
      if (activeTimer) {
        localStorage.setItem('bujo_active_timer', JSON.stringify(activeTimer))
      } else {
        localStorage.removeItem('bujo_active_timer')
      }
    } catch (e) {
      console.error('Failed to save active timer', e)
    }
  }, [activeTimer])

  // Helper to dynamically calculate remaining seconds based on real system time
  const getRemainingSeconds = useCallback((t: ActiveTimer | null) => {
    if (!t) return 0
    const elapsed = t.accumulatedSeconds + (t.isRunning && t.startTime ? Math.floor((Date.now() - t.startTime) / 1000) : 0)
    return Math.max(0, t.durationSeconds - elapsed)
  }, [])

  // Dynamic system time checker to trigger UI updates and auto-completion
  useEffect(() => {
    if (!activeTimer?.isRunning) return

    const timerId = window.setInterval(() => {
      const remaining = getRemainingSeconds(activeTimer)
      if (remaining <= 0) {
        navigator.vibrate?.([12, 30, 12])
        setActiveTimer((current) => current ? {
          ...current,
          accumulatedSeconds: current.durationSeconds,
          startTime: null,
          isRunning: false,
          remainingSeconds: 0,
        } : null)
        window.clearInterval(timerId)
      } else {
        // Trigger a light state update to force re-render with updated dynamic system time
        setActiveTimer((current) => current ? { ...current } : null)
      }
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [activeTimer?.isRunning, activeTimer?.startTime, getRemainingSeconds])

  const startTimer = (habit: Habit) => {
    const durationSeconds = Math.max(1, habit.timerMinutes) * 60
    setActiveTimer({
      habitId: habit.id,
      habitName: habit.name,
      color: habit.color,
      durationSeconds,
      accumulatedSeconds: 0,
      startTime: Date.now(),
      isRunning: true,
      remainingSeconds: durationSeconds,
    })
  }

  const todayKey = getDateKey()
  const existingMemory = memories.find((m) => m.date === todayKey)?.text || ''
  const [memoryText, setMemoryText] = useState(existingMemory)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  useEffect(() => {
    setMemoryText(memories.find((m) => m.date === todayKey)?.text || '')
    setSaveStatus(null)
  }, [todayKey, memories])

  const handleSaveMemory = async (text: string) => {
    setSaveStatus('Saving...')
    try {
      await onSetMemory(text)
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(null), 1500)
    } catch (err) {
      setSaveStatus('Error saving')
    }
  }

  return (
    <section className="screen-stack" aria-label="Today">
      <div className="hero-panel">
        <div>
          <p className="panel-kicker">Today</p>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{activeHabits.length ? `${onTrackCount}/${activeHabits.length} on track` : 'Get started'}</span>
            {activeHabits.length > 0 && (
              <button 
                type="button" 
                className="icon-button quiet share-today-trigger"
                onClick={() => setShowTodayShare(true)}
                aria-label="Share today's progress"
                style={{ padding: '4px', opacity: 0.8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Share size={15} />
              </button>
            )}
          </h2>
        </div>
        <div className="progress-ring" style={{ '--progress': `${progressPercent}%` } as CSSProperties}>
          <span>{progressPercent}</span>
          <small>%</small>
        </div>
      </div>

      {showTodayShare && (
        <InstagramShareModal
          onClose={() => setShowTodayShare(false)}
        />
      )}

      <div className="metric-strip">
        <Metric icon={Flame} label="Current streak" value={`${streak}d`} />
        <Metric icon={Check} label="Checked today" value={`${completedCount}/${activeHabits.length}`} />
      </div>

      <MoodTracker moods={moods} onSetMood={onSetMood} />
      <DrinksTracker drinks={drinks} onUpdateDrink={onUpdateDrink} />

      {/* Daily Micro-Journal Memory Note */}
      <div className="panel-section">
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: 'var(--theme-color)' }} />
            <span>Today's Memory Note</span>
          </h2>
          {saveStatus && (
            <span className="save-status" style={{ fontSize: '12px', color: 'var(--theme-color)', fontWeight: 600 }}>
              {saveStatus}
            </span>
          )}
        </div>
        <div className="memory-editor-container" style={{ position: 'relative' }}>
          <textarea
            className="memory-textarea"
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            onBlur={() => handleSaveMemory(memoryText)}
            placeholder="What made today special? Add a short note, highlight, or memory..."
            maxLength={280}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '4px', padding: '0 4px' }}>
            <span>{memoryText.length}/280 characters</span>
            <button
              type="button"
              className="link-button"
              style={{ background: 'none', border: 'none', color: 'var(--theme-color)', cursor: 'pointer', fontWeight: 600, fontSize: '11px', padding: 0 }}
              onClick={() => handleSaveMemory(memoryText)}
            >
              Save Note
            </button>
          </div>
        </div>
      </div>

      {activeTimer && (
        <TimerPanel
          timer={{
            ...activeTimer,
            remainingSeconds: getRemainingSeconds(activeTimer)
          }}
          isCompleted={completedToday.has(activeTimer.habitId)}
          onToggleRunning={() => {
            setActiveTimer((current) => {
              if (!current) return null
              if (current.isRunning) {
                const elapsedNow = current.startTime ? Math.floor((Date.now() - current.startTime) / 1000) : 0
                return {
                  ...current,
                  accumulatedSeconds: current.accumulatedSeconds + elapsedNow,
                  startTime: null,
                  isRunning: false
                }
              } else {
                return {
                  ...current,
                  startTime: Date.now(),
                  isRunning: true
                }
              }
            })
          }}
          onReset={() => {
            setActiveTimer((current) => {
              if (!current) return null
              return {
                ...current,
                accumulatedSeconds: 0,
                startTime: current.isRunning ? Date.now() : null,
              }
            })
          }}
          onClose={() => setActiveTimer(null)}
          onComplete={async () => {
            const completed = completedToday.has(activeTimer.habitId)
            if (!completed) {
              const timerHabit = activeHabits.find((habit) => habit.id === activeTimer.habitId)
              if (timerHabit) {
                await onToggle(timerHabit, false)
              }
            }
            setActiveTimer(null)
          }}
        />
      )}

      {activeHabits.length === 0 ? (
        <EmptyHabits onAddHabit={onAddHabit} />
      ) : (
        <div className="habit-list">
          {activeHabits.map((habit) => {
            const completed = completedToday.has(habit.id)
            const dates = checkins.filter((checkin) => checkin.habitId === habit.id).map((checkin) => checkin.date)
            const habitStreak = calculateStreaks(dates).current
            const goal = getHabitGoalProgress(habit, checkins, getDateKey(), weekKeys)
            const weekly = isWeeklyHabit(habit)

            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                completed={completed}
                onTrack={goal.onTrack}
                accessory={weekly ? goal.label ?? `${goal.weekCount}/${goal.target} wk` : `${habitStreak}d`}
                accessoryIcon={weekly ? CalendarDays : Flame}
                onClick={async () => {
                  navigator.vibrate?.(8)
                  await onToggle(habit, completed)
                }}
                onStartTimer={() => startTimer(habit)}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

function HabitsView({
  habits,
  onAddHabit,
  onArchive,
  onEdit,
}: {
  habits: Habit[]
  onAddHabit: () => void
  onArchive: (habitId: string) => Promise<void>
  onEdit: (habit: Habit) => void
}) {
  const activeHabits = habits.filter((habit) => habit.active)

  return (
    <section className="screen-stack" aria-label="Habits">
      <button className="primary-action" type="button" onClick={onAddHabit}>
        <Plus size={20} />
        <span>New habit</span>
      </button>

      <div className="grouped-list">
        {activeHabits.length === 0 ? (
          <InlineMessage message="No active habits yet. Add one tiny routine to begin." />
        ) : (
          activeHabits.map((habit) => (
            <div className="manage-row" key={habit.id}>
              <HabitIdentity habit={habit} />
              <div className="row-badges">
                <HabitBadges habit={habit} accessory={habit.timerEnabled ? `${habit.timerMinutes}m` : undefined} />
              </div>
              <div className="row-actions">
                <button className="icon-button quiet" type="button" aria-label={`Edit ${habit.name}`} onClick={() => onEdit(habit)}>
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button quiet"
                  type="button"
                  aria-label={`Archive ${habit.name}`}
                  onClick={() => onArchive(habit.id)}
                >
                  <Archive size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function DaySummarySheet({
  dateKey,
  activeHabits,
  checkins,
  moods,
  drinks,
  memories,
  onToggle,
  onSetMood,
  onUpdateDrink,
  onSetMemory,
  onClose,
  prefs,
}: {
  dateKey: string
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  memories: DailyMemory[]
  onToggle: (habitId: string, completed: boolean) => Promise<void>
  onSetMood: (timeOfDay: TimeOfDay, value: MoodValue | null) => Promise<void>
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink', delta: number) => Promise<void>
  onSetMemory: (text: string) => Promise<void>
  onClose: () => void
  prefs: NotificationPrefs
}) {
  const todaysMoods = moods.filter((m) => m.date === dateKey)
  const morningMood = todaysMoods.find((m) => m.timeOfDay === 'morning')?.value
  const eveningMood = todaysMoods.find((m) => m.timeOfDay === 'evening')?.value

  const completedIds = new Set(checkins.filter((c) => c.date === dateKey).map((c) => c.habitId))
  const completedCount = activeHabits.filter((h) => completedIds.has(h.id)).length

  const todaysDrinks = drinks.find((d) => d.date === dateKey) || { water: 0, coffee: 0, alcohol: 0, wine: 0, softdrink: 0 }

  const existingMemory = memories.find((m) => m.date === dateKey)?.text || ''
  const [memoryText, setMemoryText] = useState(existingMemory)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)

  useEffect(() => {
    setMemoryText(memories.find((m) => m.date === dateKey)?.text || '')
    setSaveStatus(null)
    setImportNotice(null)
  }, [dateKey, memories])

  const handleSaveMemory = async (text: string) => {
    setSaveStatus('Saving...')
    try {
      await onSetMemory(text)
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(null), 1500)
    } catch (err) {
      setSaveStatus('Error saving')
    }
  }

  const moodOptions: Array<{ value: MoodValue; icon: React.ReactNode; label: string }> = [
    { value: 'terrible', icon: <CloudRain size={20} />, label: 'Terrible' },
    { value: 'bad', icon: <Frown size={20} />, label: 'Bad' },
    { value: 'okay', icon: <Meh size={20} />, label: 'Okay' },
    { value: 'good', icon: <Smile size={20} />, label: 'Good' },
    { value: 'great', icon: <Laugh size={20} />, label: 'Great' },
  ]

  const drinkOptions: Array<{ type: 'water' | 'coffee' | 'softdrink' | 'wine' | 'alcohol'; label: string; icon: React.ReactNode; colorClass: string }> = [
    { type: 'water', label: 'Water', icon: <GlassWater size={18} />, colorClass: 'water' },
    { type: 'coffee', label: 'Coffee', icon: <Coffee size={18} />, colorClass: 'coffee' },
    { type: 'softdrink', label: 'Soda', icon: <CupSoda size={18} />, colorClass: 'softdrink' },
    { type: 'wine', label: 'Wine', icon: <Wine size={18} />, colorClass: 'wine' },
    { type: 'alcohol', label: 'Beer', icon: <Beer size={18} />, colorClass: 'alcohol' },
  ]

  const mockPostsForDate = useMemo(() => {
    const seed = dateKey.split('-').reduce((acc, val) => acc + Number(acc) + (val.charCodeAt(0) || 0), 0)
    const instagramCaptions = [
      "Had an amazing workout today! 🏃‍♂️💨 Crushing habits! #fitness #healthy",
      "Cozy morning at the local coffee shop. ☕ Highly productive session today.",
      "Beautiful sunset walk today. 🌅 Mindful breathing and screen detox.",
      "Just finished meal prep for the upcoming week! 🥗 Feeling organized.",
      "Tackled 2 full hours of deep learning & reading today! 📚🧠",
      "Hit the gym and cracked a new personal record! 🏋️‍♀️ Hard work pays off.",
    ]
    const tiktokCaptions = [
      "My healthy morning routine! ✨ #aesthetic #productivity #glowup",
      "Quick vlog: tracking my habits and drinking water all day! 💧",
      "Unboxing new fitness gear and planning my workouts! 👟💪",
      "Day in the life of staying consistent! 🚀 Don't stop moving.",
      "Made a super delicious protein bowl today! 🥑🍳 #cooking",
      "15 mins morning yoga flow for absolute peace of mind! 🧘‍♂️ Try this!",
    ]
    const facebookCaptions = [
      "Super grateful for a productive and healthy day! 🌟 Stay positive.",
      "Scenic bike ride around the lake this evening! 🚴‍♂️ Breath of fresh air.",
      "Reflecting on small daily habits making huge changes. 📈",
      "Cooked a super healthy dinner tonight! 🥦🥘 Healthy mind, healthy body.",
      "Started the day with 15 mins of deep meditation. 🧘‍♂️ Feeling calm.",
      "Checked off all my active habits on Bujo today! 🏆 What a win!",
    ]

    const index = seed % 6
    return {
      instagram: instagramCaptions[index],
      tiktok: tiktokCaptions[index],
      facebook: facebookCaptions[index],
    }
  }, [dateKey])

  const hasInstagram = prefs.socialConnectedInstagram
  const hasTiktok = prefs.socialConnectedTiktok
  const hasFacebook = prefs.socialConnectedFacebook
  const anySocialConnected = hasInstagram || hasTiktok || hasFacebook

  return (
    <div className="sheet-backdrop">
      <div className="sheet">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{format(dateFromKey(dateKey), 'MMMM d, yyyy')}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="sheet-content" style={{ display: 'grid', gap: '20px', paddingBottom: '20px' }}>
          
          {/* Daily Memory Note */}
          <div className="panel-section">
            <div className="section-heading">
              <h2>Daily Memory</h2>
              {saveStatus && <span className="save-status" style={{ fontSize: '12px', color: 'var(--theme-color)', fontWeight: 600 }}>{saveStatus}</span>}
            </div>
            <div className="memory-editor-container" style={{ position: 'relative' }}>
              <textarea
                className="memory-textarea"
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                onBlur={() => handleSaveMemory(memoryText)}
                placeholder="What made today special? Add a short note, highlight, or memory..."
                maxLength={280}
                rows={3}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '14px', resize: 'none', outline: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '4px', padding: '0 4px' }}>
                <span>{memoryText.length}/280 characters</span>
                <button
                  type="button"
                  className="link-button"
                  style={{ background: 'none', border: 'none', color: 'var(--theme-color)', cursor: 'pointer', fontWeight: 600, fontSize: '11px', padding: 0 }}
                  onClick={() => handleSaveMemory(memoryText)}
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Social Sync Import */}
            {anySocialConnected ? (
              <div className="social-imports-list" style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                {importNotice && <div style={{ fontSize: '11px', color: 'var(--theme-color)', padding: '0 4px', fontWeight: 500 }}>{importNotice}</div>}
                
                {hasInstagram && (
                  <div className="social-sync-post-card" style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <InstagramIcon size={12} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Instagram</span>
                      </div>
                      <button
                        type="button"
                        style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--theme-color)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        onClick={() => {
                          const captionText = mockPostsForDate.instagram
                          setMemoryText((prev) => {
                            const base = prev.trim()
                            return base ? `${base}\n\n📸 Instagram: ${captionText}` : `📸 Instagram: ${captionText}`
                          })
                          setImportNotice("Imported Instagram post! Remember to tap Save Note.")
                        }}
                      >
                        + Add to Note
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--text)', opacity: 0.9 }}>
                      "{mockPostsForDate.instagram}"
                    </p>
                  </div>
                )}

                {hasTiktok && (
                  <div className="social-sync-post-card" style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <TiktokIcon size={12} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>TikTok Video</span>
                      </div>
                      <button
                        type="button"
                        style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--theme-color)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        onClick={() => {
                          const captionText = mockPostsForDate.tiktok
                          setMemoryText((prev) => {
                            const base = prev.trim()
                            return base ? `${base}\n\n🎥 TikTok: ${captionText}` : `🎥 TikTok: ${captionText}`
                          })
                          setImportNotice("Imported TikTok caption! Remember to tap Save Note.")
                        }}
                      >
                        + Add to Note
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--text)', opacity: 0.9 }}>
                      "{mockPostsForDate.tiktok}"
                    </p>
                  </div>
                )}

                {hasFacebook && (
                  <div className="social-sync-post-card" style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <FacebookIcon size={12} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Facebook Post</span>
                      </div>
                      <button
                        type="button"
                        style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--theme-color)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        onClick={() => {
                          const captionText = mockPostsForDate.facebook
                          setMemoryText((prev) => {
                            const base = prev.trim()
                            return base ? `${base}\n\n👥 Facebook: ${captionText}` : `👥 Facebook: ${captionText}`
                          })
                          setImportNotice("Imported Facebook status! Remember to tap Save Note.")
                        }}
                      >
                        + Add to Note
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--text)', opacity: 0.9 }}>
                      "{mockPostsForDate.facebook}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '8px 0 0', padding: '0 4px', fontStyle: 'italic' }}>
                💡 Tip: Connect Instagram or TikTok in settings to import daily posts here!
              </p>
            )}
          </div>

          {/* Interactive Mood Tracker */}
          <div className="panel-section">
            <div className="section-heading">
              <h2>Mood</h2>
            </div>
            <div className="mood-tracker" style={{ gap: '12px' }}>
              <div className="mood-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Sleep Quality</span>
                <div className="mood-options" style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
                  {moodOptions.map((opt) => (
                    <button
                      key={`morning-${opt.value}`}
                      type="button"
                      className={`mood-btn ${morningMood === opt.value ? 'active' : ''}`}
                      onClick={() => onSetMood('morning', morningMood === opt.value ? null : opt.value)}
                      aria-label={opt.label}
                      style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid var(--line)', background: morningMood === opt.value ? 'var(--theme-color)' : 'var(--surface)', color: morningMood === opt.value ? '#fff' : 'var(--text)', cursor: 'pointer' }}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mood-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start', marginTop: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Day Feeling</span>
                <div className="mood-options" style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
                  {moodOptions.map((opt) => (
                    <button
                      key={`evening-${opt.value}`}
                      type="button"
                      className={`mood-btn ${eveningMood === opt.value ? 'active' : ''}`}
                      onClick={() => onSetMood('evening', eveningMood === opt.value ? null : opt.value)}
                      aria-label={opt.label}
                      style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid var(--line)', background: eveningMood === opt.value ? 'var(--theme-color)' : 'var(--surface)', color: eveningMood === opt.value ? '#fff' : 'var(--text)', cursor: 'pointer' }}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Drinks Tracker */}
          <div className="panel-section">
            <div className="section-heading">
              <h2>Drinks</h2>
            </div>
            <div className="drinks-history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {drinkOptions.map((opt) => {
                const count = todaysDrinks[opt.type] || 0
                return (
                  <div key={opt.type} className="drink-history-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>{opt.label}</span>
                    <div className={`drink-icon ${opt.colorClass}`} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      {opt.icon}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        style={{ padding: '2px 6px', fontSize: '12px', fontWeight: 700, background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
                        onClick={() => onUpdateDrink(opt.type, -1)}
                        disabled={count <= 0}
                      >
                        -
                      </button>
                      <strong style={{ fontSize: '13px', minWidth: '12px', textAlign: 'center', color: 'var(--text)' }}>{count}</strong>
                      <button
                        type="button"
                        style={{ padding: '2px 6px', fontSize: '12px', fontWeight: 700, background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
                        onClick={() => onUpdateDrink(opt.type, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interactive Habits Tracker */}
          <div className="panel-section">
            <div className="section-heading">
              <h2>Habits</h2>
              <span>{completedCount}/{activeHabits.length}</span>
            </div>
            <div className="habit-list" style={{ display: 'grid', gap: '8px' }}>
              {activeHabits.map((h) => {
                const isCompleted = completedIds.has(h.id)
                return (
                  <div 
                    key={h.id} 
                    className={`habit-row ${isCompleted ? 'completed' : ''}`} 
                    style={{ 
                      minHeight: 'auto', 
                      padding: '10px 14px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: 'var(--surface)',
                      borderRadius: '14px',
                      border: '1px solid var(--line)',
                      opacity: isCompleted ? 1 : 0.85
                    }}
                  >
                    <HabitIdentity habit={h} />
                    <button
                      type="button"
                      className="check-control"
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        border: isCompleted ? 'none' : '1px solid var(--line)', 
                        background: isCompleted ? 'var(--theme-color)' : 'transparent', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#fff', 
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={() => onToggle(h.id, isCompleted)}
                      aria-label={isCompleted ? `Undo ${h.name}` : `Complete ${h.name}`}
                    >
                      {isCompleted && <Check size={16} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function ActivityCalendar({
  activeHabits,
  checkins,
  moods,
  drinks,
  memories,
  prefs,
  onToggle,
  onSetMood,
  onUpdateDrink,
  onSetMemory,
  doneIdsForDate,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  memories: DailyMemory[]
  prefs: NotificationPrefs
  onToggle: (habitId: string, completed: boolean, date: string) => Promise<void>
  onSetMood: (timeOfDay: TimeOfDay, value: MoodValue | null, date: string) => Promise<void>
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink', delta: number, date: string) => Promise<void>
  onSetMemory: (text: string, date: string) => Promise<void>
  doneIdsForDate: (dateKey: string) => Set<string>
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start, end })

  const dayRate = (dateKey: string) => {
    if (!activeHabits.length) return 0
    return Math.round((doneIdsForDate(dateKey).size / activeHabits.length) * 100)
  }

  return (
    <div className="panel-section">
      <div className="section-heading">
        <h2>Activity</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" className="icon-button quiet" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ minWidth: '90px', textAlign: 'center' }}>{format(currentMonth, 'MMM yyyy')}</span>
          <button type="button" className="icon-button quiet" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      
      <div className="activity-calendar">
        <div className="calendar-weekdays">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {allDays.map((date) => {
            const key = getDateKey(date)
            const isCurrentMonth = isSameMonth(date, currentMonth)
            const isTodayDate = isToday(date)
            const progress = dayRate(key)
            
            return (
              <button
                key={key}
                type="button"
                className={`calendar-day ${isCurrentMonth ? '' : 'outside'} ${isTodayDate ? 'today' : ''} ${selectedDate === key ? 'selected' : ''}`}
                onClick={() => setSelectedDate(key)}
                aria-label={`View ${key}`}
              >
                <div className="mini-ring" style={{ '--progress': `${progress}%` } as CSSProperties}>
                  <span>{format(date, 'd')}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <DaySummarySheet
          dateKey={selectedDate}
          activeHabits={activeHabits}
          checkins={checkins}
          moods={moods}
          drinks={drinks}
          memories={memories}
          onToggle={(habitId, completed) => onToggle(habitId, completed, selectedDate)}
          onSetMood={(timeOfDay, value) => onSetMood(timeOfDay, value, selectedDate)}
          onUpdateDrink={(type, delta) => onUpdateDrink(type, delta, selectedDate)}
          onSetMemory={(text) => onSetMemory(text, selectedDate)}
          onClose={() => setSelectedDate(null)}
          prefs={prefs}
        />
      )}
    </div>
  )
}

const achievementIcons: Record<string, LucideIcon> = {
  Sprout: Sprout,
  Flame: Flame,
  GlassWater: GlassWater,
  Timer: Timer,
  Moon: Moon,
  Trophy: Trophy,
  Plus: Plus,
  Zap: Zap,
  Award: Award,
  Crown: Crown,
  Shield: Shield,
  Droplets: Droplets,
  Coffee: Coffee,
  CupSoda: CupSoda,
  Leaf: Leaf,
  Sun: Sun,
  Brain: Brain,
  Smile: Smile,
  Clock: Clock,
  Dumbbell: Dumbbell,
  Apple: Apple,
  BookOpen: BookOpen,
  Clock3: Clock3,
  Camera: Camera,
  Share: Share,
  Users: Users,
  PartyPopper: PartyPopper,
  Medal: Medal,
  Heart: Heart,
  Target: Target,
  GraduationCap: GraduationCap,
  Star: Star,
  Sparkles: Sparkles,
  Compass: Compass,
  Send: Send,
  Check: Check,
  Carrot: Carrot,
  Salad: Salad,
  Footprints: Footprints,
  Bike: Bike,
  CalendarDays: CalendarDays,
  Gift: Gift,
}

function computeAchievements(
  habits: Habit[],
  checkins: Array<{ habitId: string; date: string }>,
  moods: MoodCheckin[],
  drinks: DrinkCheckin[],
  streak: number,
  memories: DailyMemory[],
  prefs: NotificationPrefs,
  circles: Circle[] = [],
  _friends: FriendProfile[] = [],
  cheersSent: Cheer[] = [],
  cheersReceived: Cheer[] = []
): Achievement[] {
  // Existing stats
  const hasFirstBloom = checkins.length > 0
  const hasStreakBlaze = streak >= 7
  const maxWater = drinks.length > 0 ? Math.max(...drinks.map((d) => d.water || 0)) : 0
  const hasHydrationHero = maxWater >= 5

  const hasZenMaster = checkins.some((c) => {
    const h = habits.find((habit) => habit.id === c.habitId)
    return h ? h.timerEnabled : false
  })

  const eveningMoodsCount = moods.filter((m) => m.timeOfDay === 'evening').length
  const hasSelfReflective = eveningMoodsCount >= 3

  const checkinsByDate: Record<string, number> = {}
  checkins.forEach((c) => {
    checkinsByDate[c.date] = (checkinsByDate[c.date] || 0) + 1
  })
  const maxDailyCheckins = Object.values(checkinsByDate).length > 0 ? Math.max(...Object.values(checkinsByDate)) : 0
  const hasAllRounder = maxDailyCheckins >= 3

  // 1. Habit/Streak Achievements
  const hasHabitStarter = habits.length >= 3
  const hasConsistencyCatalyst = streak >= 3
  const hasStreakMaster = streak >= 14
  const hasStreakLegend = streak >= 30

  let hasCheckinSat = false
  let hasCheckinSun = false
  checkins.forEach((c) => {
    const day = new Date(c.date).getDay() // 0 = Sunday, 6 = Saturday
    if (day === 6) hasCheckinSat = true
    if (day === 0) hasCheckinSun = true
  })
  const hasWeekendWarrior = hasCheckinSat && hasCheckinSun

  // 2. Hydration/Drink Achievements
  const totalWater = drinks.reduce((sum, d) => sum + (d.water || 0), 0)
  const hasWaterWarrior = totalWater >= 20

  const maxCoffee = drinks.length > 0 ? Math.max(...drinks.map((d) => d.coffee || 0)) : 0
  const hasCaffeineConnoisseur = maxCoffee >= 3

  const hasSodaSkipper = drinks.some(
    (d) => (d.softdrink === 0 || !d.softdrink) && ((d.water || 0) + (d.coffee || 0) + (d.alcohol || 0) + (d.wine || 0) > 0)
  )

  const hasSoberDay = drinks.some(
    (d) => (d.alcohol === 0 || !d.alcohol) && (d.wine === 0 || !d.wine) && (d.water || 0) > 0
  )

  // 3. Mood/Mindfulness Achievements
  const morningMoodsCount = moods.filter((m) => m.timeOfDay === 'morning').length
  const hasMorningPerson = morningMoodsCount >= 3
  const hasMindOverMatter = moods.length >= 10
  const hasPositivityBooster = moods.some((m) => m.value === 'great')
  const hasCalmCentered = habits.some((h) => h.timerEnabled && h.timerMinutes >= 15)

  // 4. Health & Fitness Achievements
  const fitnessIcons = ['dumbbell', 'bike', 'steps', 'activity']
  const hasFitnessEnthusiast = habits.some((h) => fitnessIcons.includes(h.icon))

  const dietIcons = ['apple', 'carrot', 'salad', 'sprout']
  const hasGreenMachine = habits.some((h) => dietIcons.includes(h.icon))

  const learningIcons = ['book', 'brain', 'graduation-cap', 'microscope']
  const hasBookworm = habits.some((h) => learningIcons.includes(h.icon))

  const hasEarlyBird = habits.some((h) => {
    if (!h.reminderEnabled || !h.reminderTime) return false
    const [hour] = h.reminderTime.split(':').map(Number)
    return hour < 8
  })

  const hasNightOwl = habits.some((h) => {
    if (!h.reminderEnabled || !h.reminderTime) return false
    const [hour, min] = h.reminderTime.split(':').map(Number)
    return hour > 21 || (hour === 21 && min >= 30)
  })

  // 5. Daily Memories & Social/General Achievements
  const hasMemoryMaker = memories.length >= 3
  const hasSocialButterfly = Boolean(
    prefs?.socialConnectedInstagram || prefs?.socialConnectedTiktok || prefs?.socialConnectedFacebook
  )

  const perfectionistCheck = Object.keys(checkinsByDate).some((dateKey) => {
    const dailyCount = checkinsByDate[dateKey]
    return habits.length >= 2 && dailyCount >= habits.length
  })
  const hasPerfectionist = perfectionistCheck
  const hasOverachiever = maxDailyCheckins > 5

  // ====== 72 NEW ACHIEVEMENTS CALCULATIONS ======

  // 1. Streaks & Consistency Extension (15 achievements)
  const hasHabitNovice = streak >= 2
  const hasConsistencyChamp = streak >= 5
  const hasStreakWarrior = streak >= 10
  const hasStreakTitan = streak >= 21
  const hasCenturyClub = streak >= 50
  const hasStreakDeity = streak >= 75
  const hasHabitCenturion = streak >= 100

  const perfectDaysCount = Object.keys(checkinsByDate).filter((dateKey) => {
    const dailyCount = checkinsByDate[dateKey]
    return habits.length >= 2 && dailyCount >= habits.length
  }).length
  const hasPerfectThree = perfectDaysCount >= 3
  const hasPerfectSeven = perfectDaysCount >= 7
  const hasPerfectThirty = perfectDaysCount >= 30

  const totalCheckinsCount = checkins.length
  const hasHabitDevotee = totalCheckinsCount >= 50
  const hasHabitCrusader = totalCheckinsCount >= 100
  const hasHabitChampion = totalCheckinsCount >= 250
  const hasHabitLegend = totalCheckinsCount >= 500
  const hasHabitImmortal = totalCheckinsCount >= 1000

  // 2. Hydration & Beverages Extension (12 achievements)
  const hasWaterEnthusiast = totalWater >= 50
  const hasWaterMaster = totalWater >= 100
  const hasWaterMonarch = totalWater >= 250
  const hasOceanBreeze = totalWater >= 500

  const sortedWaterDates = [...new Set(drinks.filter((d) => (d.water || 0) > 0).map((d) => d.date))].sort()
  let maxWaterStreak = 0
  let currentWaterStreak = 0
  let prevWaterDate: Date | null = null
  sortedWaterDates.forEach((dateStr) => {
    const currentDate = new Date(dateStr)
    if (!prevWaterDate) {
      currentWaterStreak = 1
    } else {
      const diffTime = Math.abs(currentDate.getTime() - prevWaterDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays <= 1) {
        currentWaterStreak++
      } else {
        currentWaterStreak = 1
      }
    }
    if (currentWaterStreak > maxWaterStreak) {
      maxWaterStreak = currentWaterStreak
    }
    prevWaterDate = currentDate
  })
  const hasHydrationDevotee = maxWaterStreak >= 7

  const hasTeaTime = drinks.some((d) => (d.water || 0) > 2 && (d.softdrink || 0) === 0 && (d.coffee || 0) === 0)

  const soberDaysCount = drinks.filter((d) => (d.alcohol || 0) === 0 && (d.wine || 0) === 0 && (d.water || 0) > 0).length
  const hasCleanStart = soberDaysCount >= 5
  const hasSoberSentry = soberDaysCount >= 15

  const coffeeDaysCount = drinks.filter((d) => (d.coffee || 0) > 0).length
  const hasCaffeineCommander = coffeeDaysCount >= 10
  const hasCaffeineCurtail = drinks.some((d) => (d.coffee || 0) > 0 && (d.coffee || 0) <= 1)

  const sodaSkippedCount = drinks.filter((d) => (d.softdrink || 0) === 0 && ((d.water || 0) > 0 || (d.coffee || 0) > 0)).length
  const hasSodaSkeptic = sodaSkippedCount >= 10
  const hasSodaAbolisher = sodaSkippedCount >= 30

  // 3. Mood & Reflection Extension (12 achievements)
  const hasMindfulnessBeginner = moods.length >= 5
  const hasEmotionalMapper = moods.length >= 25
  const hasInnerPeace = moods.length >= 50
  const hasStoicReflector = moods.length >= 100

  const hasEveningAnchor = eveningMoodsCount >= 10
  const hasEveningGuru = eveningMoodsCount >= 30

  const hasSunriseSeeker = morningMoodsCount >= 10
  const hasSunriseExpert = morningMoodsCount >= 30

  const sortedMoodDates = [...new Set(moods.filter((m) => m.value === 'good' || m.value === 'great').map((m) => m.date))].sort()
  let maxPosStreak = 0
  let currentPosStreak = 0
  let prevPosDate: Date | null = null
  sortedMoodDates.forEach((dateStr) => {
    const currentDate = new Date(dateStr)
    if (!prevPosDate) {
      currentPosStreak = 1
    } else {
      const diffTime = Math.abs(currentDate.getTime() - prevPosDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays <= 1) {
        currentPosStreak++
      } else {
        currentPosStreak = 1
      }
    }
    if (currentPosStreak > maxPosStreak) {
      maxPosStreak = currentPosStreak
    }
    prevPosDate = currentDate
  })
  const hasPositivityStreak = maxPosStreak >= 5

  const greatMoodsCount = moods.filter((m) => m.value === 'great').length
  const hasPositivityRadiator = greatMoodsCount >= 10

  const timerCheckins = checkins.filter((c) => {
    const h = habits.find((habit) => habit.id === c.habitId)
    return h ? h.timerEnabled : false
  })
  const hasCalmArchitect = timerCheckins.length >= 10
  const hasFocusMonk = habits.some((h) => h.timerEnabled && h.timerMinutes >= 25)

  // 4. Categorized Habits Extension (13 achievements)
  const fitnessCheckins = checkins.filter((c) => {
    const h = habits.find((habit) => habit.id === c.habitId)
    return h ? fitnessIcons.includes(h.icon) : false
  })
  const hasFitnessRecruit = fitnessCheckins.length >= 5
  const hasFitnessVeteran = fitnessCheckins.length >= 25
  const hasFitnessElite = fitnessCheckins.length >= 100

  const dietCheckins = checkins.filter((c) => {
    const h = habits.find((habit) => habit.id === c.habitId)
    return h ? dietIcons.includes(h.icon) : false
  })
  const hasCleanEater = dietCheckins.length >= 5
  const hasNutritionNut = dietCheckins.length >= 25
  const hasOrganicLifestyle = dietCheckins.length >= 100

  const learningCheckins = checkins.filter((c) => {
    const h = habits.find((habit) => habit.id === c.habitId)
    return h ? learningIcons.includes(h.icon) : false
  })
  const hasScholar = learningCheckins.length >= 5
  const hasIntellectual = learningCheckins.length >= 25
  const hasPolymath = learningCheckins.length >= 100

  const hasEarlyRiser = habits.some((h) => {
    if (!h.reminderEnabled || !h.reminderTime) return false
    const [hour, min] = h.reminderTime.split(':').map(Number)
    return hour < 6 || (hour === 6 && min <= 30)
  })
  const hasDawnPatrol = habits.some((h) => {
    if (!h.reminderEnabled || !h.reminderTime) return false
    const [hour, min] = h.reminderTime.split(':').map(Number)
    return hour < 5 || (hour === 5 && min <= 30)
  })
  const hasMidnightMonk = habits.some((h) => {
    if (!h.reminderEnabled || !h.reminderTime) return false
    const [hour] = h.reminderTime.split(':').map(Number)
    return hour >= 23
  })
  const hasMiddayBooster = habits.some((h) => {
    if (!h.reminderEnabled || !h.reminderTime) return false
    const [hour] = h.reminderTime.split(':').map(Number)
    return hour >= 12 && hour < 14
  })

  // 5. Diary & Journals Extension (10 achievements)
  const hasMemoryNovice = memories.length >= 5
  const hasMemoryChronicler = memories.length >= 15
  const hasMemoryHistorian = memories.length >= 30
  const hasMemoryCollector = memories.length >= 75
  const hasMemoryTitan = memories.length >= 150

  const syncedMemoriesCount = memories.filter((m) =>
    m.text.includes('#fitness') || m.text.includes('#productivity') || m.text.includes('vlog') || m.text.includes('routine') || m.text.includes('Bujo')
  ).length
  const hasUnlockedMemories = syncedMemoriesCount >= 3
  const hasSocialSynchronizer = syncedMemoriesCount >= 10

  const hasDetailedDiarist = memories.some((m) => m.text.length >= 200)
  const hasConciseChronicler = memories.some((m) => m.text.length > 0 && m.text.length <= 40)

  const sortedMemoryDates = [...new Set(memories.map((m) => m.date))].sort()
  let maxMemStreak = 0
  let currentMemStreak = 0
  let prevMemDate: Date | null = null
  sortedMemoryDates.forEach((dateStr) => {
    const currentDate = new Date(dateStr)
    if (!prevMemDate) {
      currentMemStreak = 1
    } else {
      const diffTime = Math.abs(currentDate.getTime() - prevMemDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays <= 1) {
        currentMemStreak++
      } else {
        currentMemStreak = 1
      }
    }
    if (currentMemStreak > maxMemStreak) {
      maxMemStreak = currentMemStreak
    }
    prevMemDate = currentDate
  })
  const hasWeeklyDiaryStreak = maxMemStreak >= 7

  // 6. Social & Circles Extension (10 achievements)
  const hasCirclePioneer = circles.length >= 1
  const hasCircleLeader = circles.length > 0
  const hasCircleZealot = circles.length >= 3

  const totalCheersSent = cheersSent.length
  const hasCheerGiver = totalCheersSent >= 5
  const hasCheerChampion = totalCheersSent >= 25
  const hasCheerLegend = totalCheersSent >= 100

  const totalCheersReceived = cheersReceived.length
  const hasEncouragementMagnet = totalCheersReceived >= 5
  const hasEncouragementCelebrity = totalCheersReceived >= 25

  const hasFriendlyNudge = totalCheersSent >= 1
  const hasNudgeMaster = totalCheersSent >= 8

  return [
    // ----------------------------------------------------
    // ORIGINAL 28 ACHIEVEMENTS
    // ----------------------------------------------------
    {
      id: 'first-bloom',
      title: 'First Bloom',
      description: 'Completed your first ever daily tiny routine to start your growth journey.',
      icon: 'Sprout',
      color: 'linear-gradient(135deg, #2ecc71, #27ae60)',
      unlocked: hasFirstBloom,
      progressText: hasFirstBloom ? 'Unlocked' : '0/1 step',
      sharingText: '🌱 I just unlocked the "First Bloom" achievement on Bujo! My personal growth journey has officially begun! 🚀',
    },
    {
      id: 'streak-blaze',
      title: 'Streak Blaze',
      description: 'Maintained a consistent habit completion streak for 7 consecutive days.',
      icon: 'Flame',
      color: 'linear-gradient(135deg, #e67e22, #e74c3c)',
      unlocked: hasStreakBlaze,
      progressText: hasStreakBlaze ? 'Unlocked' : `${streak}/7 days`,
      sharingText: `🔥 Streak Blaze Unlocked! I've kept up a 7-day habit streak on Bujo. Consistency is power! 💪`,
    },
    {
      id: 'hydration-hero',
      title: 'Hydration Hero',
      description: 'Logged 5 or more cups of water in a single day to stay clean and hydrated.',
      icon: 'GlassWater',
      color: 'linear-gradient(135deg, #3498db, #2980b9)',
      unlocked: hasHydrationHero,
      progressText: hasHydrationHero ? 'Unlocked' : `${maxWater}/5 cups`,
      sharingText: '💧 Hydration Hero Unlocked! Successfully stayed perfectly hydrated with 5+ cups of water logged on Bujo! 🥤',
    },
    {
      id: 'zen-master',
      title: 'Zen Master',
      description: 'Completed at least one focused meditation or work session using the habit timer.',
      icon: 'Timer',
      color: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
      unlocked: hasZenMaster,
      progressText: hasZenMaster ? 'Unlocked' : '0/1 session',
      sharingText: '🧘‍♂️ Zen Master Unlocked! Just completed a deep focus habit session with the Bujo focus timer! Mindful and productive. ⚡',
    },
    {
      id: 'self-reflective',
      title: 'Self-Reflective',
      description: 'Recorded at least 3 evening mood check-ins to review and reflect on your days.',
      icon: 'Moon',
      color: 'linear-gradient(135deg, #4f68ff, #3d3b76)',
      unlocked: hasSelfReflective,
      progressText: hasSelfReflective ? 'Unlocked' : `${eveningMoodsCount}/3 reviews`,
      sharingText: `🌙 Self-Reflective Unlocked! I've logged 3 evening reviews on Bujo to reflect on my daily moods. 💭`,
    },
    {
      id: 'all-rounder',
      title: 'All-Rounder',
      description: 'Achieved complete success by logging 3 or more completed habits in a single day.',
      icon: 'Trophy',
      color: 'linear-gradient(135deg, #f1c40f, #d69d16)',
      unlocked: hasAllRounder,
      progressText: hasAllRounder ? 'Unlocked' : `${maxDailyCheckins}/3 habits`,
      sharingText: `🏆 All-Rounder Unlocked! Crushed it today by completing 3+ habits in a single day on Bujo! Hitting high gear! 🌟`,
    },
    {
      id: 'habit-starter',
      title: 'Habit Starter',
      description: 'Added 3 active habits to your dashboard to expand your routines.',
      icon: 'Plus',
      color: 'linear-gradient(135deg, #1abc9c, #16a085)',
      unlocked: hasHabitStarter,
      progressText: hasHabitStarter ? 'Unlocked' : `${habits.length}/3 habits`,
      sharingText: '🌱 Habit Starter Unlocked! I have set up 3 active daily habits on Bujo to expand my routines! 🚀',
    },
    {
      id: 'consistency-catalyst',
      title: 'Consistency Catalyst',
      description: 'Maintained a consistent habit completion streak for 3 consecutive days.',
      icon: 'Zap',
      color: 'linear-gradient(135deg, #f39c12, #d35400)',
      unlocked: hasConsistencyCatalyst,
      progressText: hasConsistencyCatalyst ? 'Unlocked' : `${streak}/3 days`,
      sharingText: '⚡ Consistency Catalyst Unlocked! Kept up my habit streaks for 3 days straight on Bujo! Momentum is building! 🔥',
    },
    {
      id: 'streak-master',
      title: 'Streak Master',
      description: 'Maintained a consistent habit completion streak for 14 consecutive days.',
      icon: 'Award',
      color: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      unlocked: hasStreakMaster,
      progressText: hasStreakMaster ? 'Unlocked' : `${streak}/14 days`,
      sharingText: '🏅 Streak Master Unlocked! Successfully sustained a 14-day consecutive habit streak on Bujo! Commitment pays off! 💪',
    },
    {
      id: 'streak-legend',
      title: 'Streak Legend',
      description: 'Maintained a consistent habit completion streak for 30 consecutive days.',
      icon: 'Crown',
      color: 'linear-gradient(135deg, #8e44ad, #2c3e50)',
      unlocked: hasStreakLegend,
      progressText: hasStreakLegend ? 'Unlocked' : `${streak}/30 days`,
      sharingText: '👑 Streak Legend Unlocked! I just hit a massive 30-day consecutive streak on Bujo! Absolutely unstoppable! 🏆🔥',
    },
    {
      id: 'weekend-warrior',
      title: 'Weekend Warrior',
      description: 'Completed habits on both Saturday and Sunday to maintain consistency.',
      icon: 'Shield',
      color: 'linear-gradient(135deg, #2ecc71, #27ae60)',
      unlocked: hasWeekendWarrior,
      progressText: hasWeekendWarrior ? 'Unlocked' : '0/1 weekend',
      sharingText: '🛡️ Weekend Warrior Unlocked! Kept my streak going through the weekend on Bujo! Saturday and Sunday checked! 🏃‍♂️💨',
    },
    {
      id: 'water-warrior',
      title: 'Water Warrior',
      description: 'Logged a total of 20 or more cups of water across history to stay perfectly hydrated.',
      icon: 'Droplets',
      color: 'linear-gradient(135deg, #4ad2ff, #2878ff)',
      unlocked: hasWaterWarrior,
      progressText: hasWaterWarrior ? 'Unlocked' : `${totalWater}/20 cups`,
      sharingText: '💦 Water Warrior Unlocked! Logged a total of 20+ cups of water across my history on Bujo! Super hydrated! 🐳',
    },
    {
      id: 'caffeine-connoisseur',
      title: 'Caffeine Connoisseur',
      description: 'Logged 3 or more cups of coffee in a single day to stay energized.',
      icon: 'Coffee',
      color: 'linear-gradient(135deg, #a0522d, #5c2c16)',
      unlocked: hasCaffeineConnoisseur,
      progressText: hasCaffeineConnoisseur ? 'Unlocked' : `${maxCoffee}/3 cups`,
      sharingText: '☕ Caffeine Connoisseur Unlocked! Energized and focused with 3+ cups of coffee logged on Bujo today! 🚀',
    },
    {
      id: 'soda-skipper',
      title: 'Soda Skipper',
      description: 'Logged other drinks but successfully skipped sodas entirely on a tracked day.',
      icon: 'CupSoda',
      color: 'linear-gradient(135deg, #e67e22, #d35400)',
      unlocked: hasSodaSkipper,
      progressText: hasSodaSkipper ? 'Unlocked' : '0/1 day',
      sharingText: '🍊 Soda Skipper Unlocked! Avoided high-sugar sodas today and chose healthier hydration options on Bujo! 🍹',
    },
    {
      id: 'sober-day',
      title: 'Clean Day',
      description: 'Logged water but successfully skipped alcohol and wine entirely on a tracked day.',
      icon: 'Leaf',
      color: 'linear-gradient(135deg, #2ecc71, #1abc9c)',
      unlocked: hasSoberDay,
      progressText: hasSoberDay ? 'Unlocked' : '0/1 day',
      sharingText: '🍃 Clean Day Unlocked! Logged zero alcohol or wine today, keeping my body fresh and clean on Bujo! 🌟',
    },
    {
      id: 'morning-person',
      title: 'Morning Person',
      description: 'Recorded at least 3 morning sleep quality check-ins to track your rest.',
      icon: 'Sun',
      color: 'linear-gradient(135deg, #ff9f43, #ee5253)',
      unlocked: hasMorningPerson,
      progressText: hasMorningPerson ? 'Unlocked' : `${morningMoodsCount}/3 rest logs`,
      sharingText: '🌅 Morning Person Unlocked! Waking up early and logging my sleep quality consistently on Bujo! 🛌',
    },
    {
      id: 'mind-over-matter',
      title: 'Mind Over Matter',
      description: 'Logged 10 total mood check-ins (morning + evening) to map your emotional state.',
      icon: 'Brain',
      color: 'linear-gradient(135deg, #a55eea, #4b0082)',
      unlocked: hasMindOverMatter,
      progressText: hasMindOverMatter ? 'Unlocked' : `${moods.length}/10 logs`,
      sharingText: '🧠 Mind Over Matter Unlocked! I\'ve logged 10 mood check-ins on Bujo to monitor my wellness! 🧘‍♂️',
    },
    {
      id: 'positivity-booster',
      title: 'Positivity Booster',
      description: 'Recorded a "great" mood value to celebrate a positive day.',
      icon: 'Smile',
      color: 'linear-gradient(135deg, #f1c40f, #f39c12)',
      unlocked: hasPositivityBooster,
      progressText: hasPositivityBooster ? 'Unlocked' : '0/1 great day',
      sharingText: '☀️ Positivity Booster Unlocked! Celebrated an absolutely great, high-energy day logged on Bujo! Positive vibes! 😄',
    },
    {
      id: 'calm-centered',
      title: 'Calm & Centered',
      description: 'Created a habit with a focus timer set to 15+ minutes for deep mindfulness.',
      icon: 'Clock',
      color: 'linear-gradient(135deg, #9b59b6, #34495e)',
      unlocked: hasCalmCentered,
      progressText: hasCalmCentered ? 'Unlocked' : '0/1 timer',
      sharingText: '🧘‍♂️ Calm & Centered Unlocked! Set up a custom 15+ min focused habit timer on Bujo to block out distractions! ⏱️',
    },
    {
      id: 'fitness-enthusiast',
      title: 'Fitness Enthusiast',
      description: 'Created a habit with a physical activity icon (dumbbell, steps, bike, activity).',
      icon: 'Dumbbell',
      color: 'linear-gradient(135deg, #10ac84, #01a3a4)',
      unlocked: hasFitnessEnthusiast,
      progressText: hasFitnessEnthusiast ? 'Unlocked' : '0/1 habit',
      sharingText: '🏋️‍♂️ Fitness Enthusiast Unlocked! Just set up my custom physical activity and workout habits on Bujo! Let\'s go! 🚴‍♂️',
    },
    {
      id: 'green-machine',
      title: 'Green Machine',
      description: 'Created a diet-centric habit with a healthy icon (apple, carrot, salad, sprout).',
      icon: 'Apple',
      color: 'linear-gradient(135deg, #2ecc71, #27ae60)',
      unlocked: hasGreenMachine,
      progressText: hasGreenMachine ? 'Unlocked' : '0/1 habit',
      sharingText: '🍎 Green Machine Unlocked! Created a custom clean eating / green diet habit on Bujo to feed my body right! 🥗',
    },
    {
      id: 'bookworm',
      title: 'Bookworm',
      description: 'Created a learning habit with a knowledge icon (book, brain, graduation-cap).',
      icon: 'BookOpen',
      color: 'linear-gradient(135deg, #3498db, #2980b9)',
      unlocked: hasBookworm,
      progressText: hasBookworm ? 'Unlocked' : '0/1 habit',
      sharingText: '📚 Bookworm Unlocked! Set up a dedicated reading and learning habit on Bujo to feed my mind! 🎓🧠',
    },
    {
      id: 'early-bird',
      title: 'Early Bird',
      description: 'Set a habit reminder before 8:00 AM to conquer your mornings early.',
      icon: 'Clock3',
      color: 'linear-gradient(135deg, #ff9f43, #ff6b6b)',
      unlocked: hasEarlyBird,
      progressText: hasEarlyBird ? 'Unlocked' : '0/1 reminder',
      sharingText: '🌅 Early Bird Unlocked! Conquering my mornings early with a custom Bujo habit reminder set before 8:00 AM! ⏰',
    },
    {
      id: 'night-owl',
      title: 'Night Owl',
      description: 'Set a habit reminder after 9:30 PM (21:30) to finish your evening routine.',
      icon: 'Moon',
      color: 'linear-gradient(135deg, #3d3b76, #1c183a)',
      unlocked: hasNightOwl,
      progressText: hasNightOwl ? 'Unlocked' : '0/1 reminder',
      sharingText: '🦉 Night Owl Unlocked! Keeping my night routines locked in with a custom Bujo habit reminder set after 9:30 PM! 🌙',
    },
    {
      id: 'memory-maker',
      title: 'Memory Maker',
      description: 'Recorded a daily micro-journal memory on at least 3 separate days.',
      icon: 'Camera',
      color: 'linear-gradient(135deg, #ff4757, #ff6b81)',
      unlocked: hasMemoryMaker,
      progressText: hasMemoryMaker ? 'Unlocked' : `${memories.length}/3 memories`,
      sharingText: '📸 Memory Maker Unlocked! Kept record of my growth with 3 daily memory entries saved on Bujo! 📖✨',
    },
    {
      id: 'social-butterfly',
      title: 'Social Butterfly',
      description: 'Connected Instagram, TikTok, or Facebook in settings to enable Social Sync.',
      icon: 'Share',
      color: 'linear-gradient(135deg, #00d2d3, #01a3a4)',
      unlocked: hasSocialButterfly,
      progressText: hasSocialButterfly ? 'Unlocked' : '0/1 sync',
      sharingText: '🔗 Social Butterfly Unlocked! Integrated my social media connection with Bujo to sync daily highlights! 📸✨',
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Achieved complete 100% success on all habits in a single day (min. 2 habits).',
      icon: 'Medal',
      color: 'linear-gradient(135deg, #f1c40f, #e67e22)',
      unlocked: hasPerfectionist,
      progressText: hasPerfectionist ? 'Unlocked' : '0/1 perfect day',
      sharingText: '🏅 Perfectionist Unlocked! Logged a perfect day with 100% of my active habits completed on Bujo! Let\'s go! 🏆🥇',
    },
    {
      id: 'overachiever',
      title: 'Overachiever',
      description: 'Pushed your boundaries by completing more than 5 habits in a single day.',
      icon: 'PartyPopper',
      color: 'linear-gradient(135deg, #ff6b6b, #ee5253)',
      unlocked: hasOverachiever,
      progressText: hasOverachiever ? 'Unlocked' : `${maxDailyCheckins}/6 habits`,
      sharingText: '🎉 Overachiever Unlocked! Crushed 6+ habits in a single day on Bujo! Pushing my limits and scaling new heights! 🚀✨',
    },

    // ----------------------------------------------------
    // ====== 72 NEW ACHIEVEMENTS ======
    // ----------------------------------------------------

    // CATEGORY 1: Streaks & Consistency (15 achievements)
    {
      id: 'habit-novice',
      title: 'Habit Novice',
      description: 'Maintained a consistent habit completion streak for 2 consecutive days.',
      icon: 'Flame',
      color: 'linear-gradient(135deg, #f0932b, #ff7979)',
      unlocked: hasHabitNovice,
      progressText: hasHabitNovice ? 'Unlocked' : `${streak}/2 days`,
      sharingText: '🔥 Habit Novice Unlocked! Just completed my habits 2 days in a row on Bujo! Small steps make huge strides! 👣🌱',
    },
    {
      id: 'consistency-champ',
      title: 'Consistency Champ',
      description: 'Maintained a consistent habit completion streak for 5 consecutive days.',
      icon: 'Zap',
      color: 'linear-gradient(135deg, #f9ca24, #f0932b)',
      unlocked: hasConsistencyChamp,
      progressText: hasConsistencyChamp ? 'Unlocked' : `${streak}/5 days`,
      sharingText: '⚡ Consistency Champ Unlocked! Hit a solid 5-day habit streak on Bujo! Moving into high gear! 🚀🔥',
    },
    {
      id: 'streak-warrior',
      title: 'Streak Warrior',
      description: 'Maintained a consistent habit completion streak for 10 consecutive days.',
      icon: 'Flame',
      color: 'linear-gradient(135deg, #eb4d4b, #ff7675)',
      unlocked: hasStreakWarrior,
      progressText: hasStreakWarrior ? 'Unlocked' : `${streak}/10 days`,
      sharingText: '🛡️ Streak Warrior Unlocked! Pushing boundaries with a 10-day consecutive habit streak on Bujo! Unstoppable force! 💪🔥',
    },
    {
      id: 'streak-titan',
      title: 'Streak Titan',
      description: 'Maintained a consistent habit completion streak for 21 consecutive days.',
      icon: 'Award',
      color: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
      unlocked: hasStreakTitan,
      progressText: hasStreakTitan ? 'Unlocked' : `${streak}/21 days`,
      sharingText: '💥 Streak Titan Unlocked! 21 consecutive days of crushed habits on Bujo! Consistency is second nature now! 🧠🏋️‍♂️',
    },
    {
      id: 'century-club',
      title: 'Century Club',
      description: 'Maintained a consistent habit completion streak for 50 consecutive days.',
      icon: 'Medal',
      color: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)',
      unlocked: hasCenturyClub,
      progressText: hasCenturyClub ? 'Unlocked' : `${streak}/50 days`,
      sharingText: '🏅 Century Club Unlocked! Crushed 50 consecutive days of habits on Bujo! Scaling absolute zen heights! 🏆🧘‍♂️',
    },
    {
      id: 'streak-deity',
      title: 'Streak Deity',
      description: 'Maintained a consistent habit completion streak for 75 consecutive days.',
      icon: 'Crown',
      color: 'linear-gradient(135deg, #0984e3, #74b9ff)',
      unlocked: hasStreakDeity,
      progressText: hasStreakDeity ? 'Unlocked' : `${streak}/75 days`,
      sharingText: '👑 Streak Deity Unlocked! Unbelievable 75 consecutive habit days logged on Bujo! Living in absolute alignment! 🌟✨',
    },
    {
      id: 'habit-centurion',
      title: 'Habit Centurion',
      description: 'Maintained a consistent habit completion streak for 100 consecutive days.',
      icon: 'Crown',
      color: 'linear-gradient(135deg, #2d3436, #636e72)',
      unlocked: hasHabitCenturion,
      progressText: hasHabitCenturion ? 'Unlocked' : `${streak}/100 days`,
      sharingText: '👑 Habit Centurion Unlocked! Historic 100-day consecutive habit streak on Bujo! Absolute master of life! 🏆🛡️',
    },
    {
      id: 'perfect-three',
      title: 'Perfect Three',
      description: 'Logged a perfect 100% success rate on all active habits on at least 3 separate days.',
      icon: 'Medal',
      color: 'linear-gradient(135deg, #00cec9, #81ecec)',
      unlocked: hasPerfectThree,
      progressText: hasPerfectThree ? 'Unlocked' : `${perfectDaysCount}/3 days`,
      sharingText: '🏅 Perfect Three Unlocked! Crushed all active habits perfectly on 3 separate days on Bujo! Consistency is key! 🎯🌟',
    },
    {
      id: 'perfect-seven',
      title: 'Perfect Seven',
      description: 'Logged a perfect 100% success rate on all active habits on at least 7 separate days.',
      icon: 'Medal',
      color: 'linear-gradient(135deg, #00b894, #55efc4)',
      unlocked: hasPerfectSeven,
      progressText: hasPerfectSeven ? 'Unlocked' : `${perfectDaysCount}/7 days`,
      sharingText: '🏅 Perfect Seven Unlocked! 7 perfect daily sheets checkins on Bujo! Aligning actions with core vision! 🌱💎',
    },
    {
      id: 'perfect-thirty',
      title: 'Perfect Thirty',
      description: 'Logged a perfect 100% success rate on all active habits on at least 30 separate days.',
      icon: 'Crown',
      color: 'linear-gradient(135deg, #d63031, #ff7675)',
      unlocked: hasPerfectThirty,
      progressText: hasPerfectThirty ? 'Unlocked' : `${perfectDaysCount}/30 days`,
      sharingText: '👑 Perfect Thirty Unlocked! 30 perfect 100% days checked on Bujo! Transforming dreams into tiny repeatable actions! 🚀🏆',
    },
    {
      id: 'habit-devotee',
      title: 'Habit Devotee',
      description: 'Logged a total of 50 check-ins across your Bujo habit history.',
      icon: 'Check',
      color: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
      unlocked: hasHabitDevotee,
      progressText: hasHabitDevotee ? 'Unlocked' : `${totalCheckinsCount}/50 checks`,
      sharingText: '🌱 Habit Devotee Unlocked! Registered 50 total check-ins on Bujo! Planting seeds for major life changes! 🌿💪',
    },
    {
      id: 'habit-crusader',
      title: 'Habit Crusader',
      description: 'Logged a total of 100 check-ins across your Bujo habit history.',
      icon: 'Check',
      color: 'linear-gradient(135deg, #e17055, #ffeaa7)',
      unlocked: hasHabitCrusader,
      progressText: hasHabitCrusader ? 'Unlocked' : `${totalCheckinsCount}/100 checks`,
      sharingText: '🛡️ Habit Crusader Unlocked! Registered 100 total habit check-ins on Bujo! Carving out a new active lifestyle! ⏱️🏋️‍♂️',
    },
    {
      id: 'habit-champion',
      title: 'Habit Champion',
      description: 'Logged a total of 250 check-ins across your Bujo habit history.',
      icon: 'Target',
      color: 'linear-gradient(135deg, #ff7675, #a29bfe)',
      unlocked: hasHabitChampion,
      progressText: hasHabitChampion ? 'Unlocked' : `${totalCheckinsCount}/250 checks`,
      sharingText: '🎯 Habit Champion Unlocked! Reached a massive 250 total habit check-ins on Bujo! Absolute focus and execution! 🏆🌟',
    },
    {
      id: 'habit-legend',
      title: 'Habit Legend',
      description: 'Logged a total of 500 check-ins across your Bujo habit history.',
      icon: 'Trophy',
      color: 'linear-gradient(135deg, #fdcb6e, #ffeaa7)',
      unlocked: hasHabitLegend,
      progressText: hasHabitLegend ? 'Unlocked' : `${totalCheckinsCount}/500 checks`,
      sharingText: '🏆 Habit Legend Unlocked! Crushed 500 total check-ins across my history on Bujo! Transforming routines into art! 🎨📖',
    },
    {
      id: 'habit-immortal',
      title: 'Habit Immortal',
      description: 'Logged a total of 1000 check-ins across your Bujo habit history.',
      icon: 'Sparkles',
      color: 'linear-gradient(135deg, #0984e3, #2d3436)',
      unlocked: hasHabitImmortal,
      progressText: hasHabitImmortal ? 'Unlocked' : `${totalCheckinsCount}/1000 checks`,
      sharingText: '✨ Habit Immortal Unlocked! Reached an astronomical 1000 total habit check-ins on Bujo! Unrivaled discipline! 👑🛡️',
    },

    // CATEGORY 2: Hydration & Beverages Expansion (12 achievements)
    {
      id: 'water-enthusiast',
      title: 'Water Enthusiast',
      description: 'Logged a total of 50 cups of water across history to stay clear and focused.',
      icon: 'Droplets',
      color: 'linear-gradient(135deg, #74b9ff, #0984e3)',
      unlocked: hasWaterEnthusiast,
      progressText: hasWaterEnthusiast ? 'Unlocked' : `${totalWater}/50 cups`,
      sharingText: '💦 Water Enthusiast Unlocked! Logged 50+ total cups of clean water on Bujo! Staying hydrated and energized! 🥤',
    },
    {
      id: 'water-master',
      title: 'Water Master',
      description: 'Logged a total of 100 cups of water across history to detoxify your system.',
      icon: 'Droplets',
      color: 'linear-gradient(135deg, #00cec9, #0984e3)',
      unlocked: hasWaterMaster,
      progressText: hasWaterMaster ? 'Unlocked' : `${totalWater}/100 cups`,
      sharingText: '💦 Water Master Unlocked! Logged a massive 100 total cups of water on Bujo! Hydrating my mind and body! 🐳💧',
    },
    {
      id: 'water-monarch',
      title: 'Water Monarch',
      description: 'Logged a total of 250 cups of water across history to reach legendary hydration.',
      icon: 'GlassWater',
      color: 'linear-gradient(135deg, #00cec9, #6c5ce7)',
      unlocked: hasWaterMonarch,
      progressText: hasWaterMonarch ? 'Unlocked' : `${totalWater}/250 cups`,
      sharingText: '👑 Water Monarch Unlocked! 250 total cups of water logged on Bujo! Staying perfectly hydrated all the way! 🌊🥤',
    },
    {
      id: 'ocean-breeze',
      title: 'Ocean Breeze',
      description: 'Logged a total of 500 cups of water across history, maintaining pure cell hydration.',
      icon: 'Trophy',
      color: 'linear-gradient(135deg, #74b9ff, #2d3436)',
      unlocked: hasOceanBreeze,
      progressText: hasOceanBreeze ? 'Unlocked' : `${totalWater}/500 cups`,
      sharingText: '🌊 Ocean Breeze Unlocked! Historic 500 total cups of water logged on Bujo! Cells are fully alive and hydrated! 🐬💦',
    },
    {
      id: 'hydration-devotee',
      title: 'Hydration Devotee',
      description: 'Logged at least one cup of water for 7 consecutive tracked days.',
      icon: 'Droplets',
      color: 'linear-gradient(135deg, #00cec9, #ffeaa7)',
      unlocked: hasHydrationDevotee,
      progressText: hasHydrationDevotee ? 'Unlocked' : '0/7 days',
      sharingText: '💧 Hydration Devotee Unlocked! Drank water consistently for 7 days in a row on Bujo! Healthy skin and body! 🍃🥤',
    },
    {
      id: 'tea-time',
      title: 'Tea Time',
      description: 'Skipped coffee and soft drinks completely while logging water on a tracked day.',
      icon: 'Leaf',
      color: 'linear-gradient(135deg, #55efc4, #00b894)',
      unlocked: hasTeaTime,
      progressText: hasTeaTime ? 'Unlocked' : '0/1 day',
      sharingText: '🍵 Tea Time Unlocked! Successfully skipped artificial sodas and coffees entirely today on Bujo! Pure hydration! 🍃',
    },
    {
      id: 'clean-start',
      title: 'Clean Start',
      description: 'Maintained 5 tracked days without logging any wine or alcohol beverages.',
      icon: 'Heart',
      color: 'linear-gradient(135deg, #ff7675, #ff7979)',
      unlocked: hasCleanStart,
      progressText: hasCleanStart ? 'Unlocked' : `${soberDaysCount}/5 days`,
      sharingText: '❤️ Clean Start Unlocked! Logged 5 sober days with zero alcohol or wine on Bujo! Keeping my health locked in! 🌟🛌',
    },
    {
      id: 'sober-sentry',
      title: 'Sober Sentry',
      description: 'Maintained 15 tracked days without logging any wine or alcohol beverages.',
      icon: 'Shield',
      color: 'linear-gradient(135deg, #fd79a8, #e84393)',
      unlocked: hasSoberSentry,
      progressText: hasSoberSentry ? 'Unlocked' : `${soberDaysCount}/15 days`,
      sharingText: '🛡️ Sober Sentry Unlocked! Sustained 15 sober days with zero alcohol logged on Bujo! Absolute self-mastery! 🛌✨',
    },
    {
      id: 'caffeine-commander',
      title: 'Caffeine Commander',
      description: 'Logged coffee check-ins on 10 separate days to fuel your productiveness.',
      icon: 'Coffee',
      color: 'linear-gradient(135deg, #ffeaa7, #d69d16)',
      unlocked: hasCaffeineCommander,
      progressText: hasCaffeineCommander ? 'Unlocked' : `${coffeeDaysCount}/10 days`,
      sharingText: '☕ Caffeine Commander Unlocked! Logged coffee on 10 separate days on Bujo! High-octane productivity! 🚀💻',
    },
    {
      id: 'caffeine-curtail',
      title: 'Caffeine Curtail',
      description: 'Restricted coffee intake to exactly 1 cup or less on a tracked coffee day.',
      icon: 'Heart',
      color: 'linear-gradient(135deg, #ff7675, #fdcb6e)',
      unlocked: hasCaffeineCurtail,
      progressText: hasCaffeineCurtail ? 'Unlocked' : '0/1 day',
      sharingText: '☕ Caffeine Curtail Unlocked! Restrained my daily coffee to 1 cup or less today on Bujo to avoid jitters! 🧘‍♂️💤',
    },
    {
      id: 'soda-skeptic',
      title: 'Soda Skeptic',
      description: 'Successfully skipped sodas entirely on 10 separate tracked days.',
      icon: 'CupSoda',
      color: 'linear-gradient(135deg, #fab1a0, #ff7675)',
      unlocked: hasSodaSkeptic,
      progressText: hasSodaSkeptic ? 'Unlocked' : `${sodaSkippedCount}/10 days`,
      sharingText: '🍊 Soda Skeptic Unlocked! Avoided high-fructose corn syrup sodas for 10 separate days on Bujo! Healthy diet! 🥗🥤',
    },
    {
      id: 'soda-abolisher',
      title: 'Soda Abolisher',
      description: 'Successfully skipped sodas entirely on 30 separate tracked days.',
      icon: 'Trophy',
      color: 'linear-gradient(135deg, #ffeaa7, #e17055)',
      unlocked: hasSodaAbolisher,
      progressText: hasSodaAbolisher ? 'Unlocked' : `${sodaSkippedCount}/30 days`,
      sharingText: '🏆 Soda Abolisher Unlocked! 30 days soda-free logged on Bujo! Conquering healthy hydration habits! 🐳🍃',
    },

    // CATEGORY 3: Mood & Reflection Expansion (12 achievements)
    {
      id: 'mindfulness-beginner',
      title: 'Mindfulness Beginner',
      description: 'Logged 5 total daily mood check-ins to start charting your mental wellness.',
      icon: 'Brain',
      color: 'linear-gradient(135deg, #a29bfe, #ffeaa7)',
      unlocked: hasMindfulnessBeginner,
      progressText: hasMindfulnessBeginner ? 'Unlocked' : `${moods.length}/5 logs`,
      sharingText: '🧠 Mindfulness Beginner Unlocked! Logged 5 mood check-ins on Bujo! Starting my daily reflection journey! 🧘‍♂️✨',
    },
    {
      id: 'emotional-mapper',
      title: 'Emotional Mapper',
      description: 'Logged 25 total mood check-ins to visually recognize emotional patterns.',
      icon: 'Brain',
      color: 'linear-gradient(135deg, #a29bfe, #6c5ce7)',
      unlocked: hasEmotionalMapper,
      progressText: hasEmotionalMapper ? 'Unlocked' : `${moods.length}/25 logs`,
      sharingText: '🧠 Emotional Mapper Unlocked! Completed 25 mood check-ins on Bujo! Charting my emotional wellness! 📈🧘‍♂️',
    },
    {
      id: 'inner-peace',
      title: 'Inner Peace',
      description: 'Logged 50 total mood check-ins to establish self-awareness and calmness.',
      icon: 'Brain',
      color: 'linear-gradient(135deg, #fd79a8, #6c5ce7)',
      unlocked: hasInnerPeace,
      progressText: hasInnerPeace ? 'Unlocked' : `${moods.length}/50 logs`,
      sharingText: '🧘‍♂️ Inner Peace Unlocked! Reached 50 mood check-ins on Bujo! Mindful self-reflection is a regular habit! 🌅💎',
    },
    {
      id: 'stoic-reflector',
      title: 'Stoic Reflector',
      description: 'Logged 100 total mood check-ins, mastering the habit of mental review.',
      icon: 'Medal',
      color: 'linear-gradient(135deg, #2d3436, #6c5ce7)',
      unlocked: hasStoicReflector,
      progressText: hasStoicReflector ? 'Unlocked' : `${moods.length}/100 logs`,
      sharingText: '🏅 Stoic Reflector Unlocked! Reached a massive 100 total mood check-ins on Bujo! Mindful, calm, and grounded! 🧠🛡️',
    },
    {
      id: 'evening-anchor',
      title: 'Evening Anchor',
      description: 'Logged 10 evening mood reviews to reflect on your daily activities.',
      icon: 'Moon',
      color: 'linear-gradient(135deg, #a29bfe, #2d3436)',
      unlocked: hasEveningAnchor,
      progressText: hasEveningAnchor ? 'Unlocked' : `${eveningMoodsCount}/10 reviews`,
      sharingText: '🌙 Evening Anchor Unlocked! Completed 10 nightly reviews on Bujo to reflect on my daily mood! 🛌💤',
    },
    {
      id: 'evening-guru',
      title: 'Evening Guru',
      description: 'Logged 30 evening mood reviews, establishing a consistent wind-down ritual.',
      icon: 'Moon',
      color: 'linear-gradient(135deg, #6c5ce7, #2d3436)',
      unlocked: hasEveningGuru,
      progressText: hasEveningGuru ? 'Unlocked' : `${eveningMoodsCount}/30 reviews`,
      sharingText: '🌙 Evening Guru Unlocked! Completed 30 tonight reviews on Bujo! Anchoring my sleep and reflecting! 🧘‍♂️💤',
    },
    {
      id: 'sunrise-seeker',
      title: 'Sunrise Seeker',
      description: 'Logged 10 morning sleep quality check-ins to map your rest patterns.',
      icon: 'Sun',
      color: 'linear-gradient(135deg, #ffeaa7, #ff7675)',
      unlocked: hasSunriseSeeker,
      progressText: hasSunriseSeeker ? 'Unlocked' : `${morningMoodsCount}/10 logs`,
      sharingText: '🌅 Sunrise Seeker Unlocked! Logged 10 morning sleep check-ins on Bujo! Tracking sleep for maximum wellness! 🛌🛌',
    },
    {
      id: 'sunrise-expert',
      title: 'Sunrise Expert',
      description: 'Logged 30 morning sleep quality check-ins to optimize your energy levels.',
      icon: 'Sun',
      color: 'linear-gradient(135deg, #fdcb6e, #d63031)',
      unlocked: hasSunriseExpert,
      progressText: hasSunriseExpert ? 'Unlocked' : `${morningMoodsCount}/30 logs`,
      sharingText: '🌅 Sunrise Expert Unlocked! Checked morning sleep 30 times on Bujo! Waking up refreshed and energized! 🛌✨',
    },
    {
      id: 'positivity-streak',
      title: 'Positivity Streak',
      description: 'Recorded positive daily moods ("great" or "good") for 5 consecutive tracked days.',
      icon: 'Smile',
      color: 'linear-gradient(135deg, #ffeaa7, #55efc4)',
      unlocked: hasPositivityStreak,
      progressText: hasPositivityStreak ? 'Unlocked' : '0/5 days',
      sharingText: '☀️ Positivity Streak Unlocked! Kept a positive emotional vibration for 5 tracked days straight on Bujo! Let\'s go! 😄✨',
    },
    {
      id: 'positivity-radiator',
      title: 'Positivity Radiator',
      description: 'Recorded 10 total "great" moods to celebrate high emotional days.',
      icon: 'Smile',
      color: 'linear-gradient(135deg, #ffeaa7, #e84393)',
      unlocked: hasPositivityRadiator,
      progressText: hasPositivityRadiator ? 'Unlocked' : `${greatMoodsCount}/10 days`,
      sharingText: '☀️ Positivity Radiator Unlocked! Logged 10 ultimate "great" days on Bujo! Overflowing with good vibes and light! 😄🌈',
    },
    {
      id: 'calm-architect',
      title: 'Calm Architect',
      description: 'Completed 10 focus sessions using the focused habit timer.',
      icon: 'Clock',
      color: 'linear-gradient(135deg, #a29bfe, #00cec9)',
      unlocked: hasCalmArchitect,
      progressText: hasCalmArchitect ? 'Unlocked' : `${timerCheckins.length}/10 sessions`,
      sharingText: '⏱️ Calm Architect Unlocked! Crushed 10 focused sessions with Bujo habit timer! Training my attention! 🧠🧘‍♂️',
    },
    {
      id: 'focus-monk',
      title: 'Focus Monk',
      description: 'Set a focused habit timer to 25+ minutes to practice deep work (Pomodoro).',
      icon: 'Timer',
      color: 'linear-gradient(135deg, #ffeaa7, #6c5ce7)',
      unlocked: hasFocusMonk,
      progressText: hasFocusMonk ? 'Unlocked' : '0/1 timer',
      sharingText: '🧘‍♂️ Focus Monk Unlocked! Created a Pomodoro focus habit set to 25+ minutes on Bujo for absolute flow! ⏱️💻',
    },

    // CATEGORY 4: Categorized Habits Expansion (13 achievements)
    {
      id: 'fitness-recruit',
      title: 'Fitness Recruit',
      description: 'Completed a workout/physical fitness-centric habit 5 times.',
      icon: 'Dumbbell',
      color: 'linear-gradient(135deg, #81ecec, #0984e3)',
      unlocked: hasFitnessRecruit,
      progressText: hasFitnessRecruit ? 'Unlocked' : `${fitnessCheckins.length}/5 completed`,
      sharingText: '🏋️‍♂️ Fitness Recruit Unlocked! Crushed physical fitness habits 5 times on Bujo! Building strength! 💪🚴‍♂️',
    },
    {
      id: 'fitness-veteran',
      title: 'Fitness Veteran',
      description: 'Completed a fitness-centric habit 25 times to lock in physical momentum.',
      icon: 'Footprints',
      color: 'linear-gradient(135deg, #55efc4, #0984e3)',
      unlocked: hasFitnessVeteran,
      progressText: hasFitnessVeteran ? 'Unlocked' : `${fitnessCheckins.length}/25 completed`,
      sharingText: '🏃‍♂️ Fitness Veteran Unlocked! 25 workouts logged on Bujo! Keeping my body resilient and active! 🚴‍♂️💨',
    },
    {
      id: 'fitness-elite',
      title: 'Fitness Elite',
      description: 'Completed a fitness-centric habit 100 times, establishing an athletic lifestyle.',
      icon: 'Bike',
      color: 'linear-gradient(135deg, #ffeaa7, #0984e3)',
      unlocked: hasFitnessElite,
      progressText: hasFitnessElite ? 'Unlocked' : `${fitnessCheckins.length}/100 completed`,
      sharingText: '🏅 Fitness Elite Unlocked! Reached 100 physical routine checks on Bujo! Peak physical condition and discipline! 🏋️‍♂️🏆',
    },
    {
      id: 'clean-eater',
      title: 'Clean Eater',
      description: 'Completed a diet/nutrition-centric habit 5 times.',
      icon: 'Carrot',
      color: 'linear-gradient(135deg, #55efc4, #ffeaa7)',
      unlocked: hasCleanEater,
      progressText: hasCleanEater ? 'Unlocked' : `${dietCheckins.length}/5 completed`,
      sharingText: '🥕 Clean Eater Unlocked! Logged clean eating habits 5 times on Bujo! Feeding my body wholesome foods! 🥗🍎',
    },
    {
      id: 'nutrition-nut',
      title: 'Nutrition Nut',
      description: 'Completed a diet/nutrition habit 25 times to cement healthy digestion.',
      icon: 'Salad',
      color: 'linear-gradient(135deg, #55efc4, #fdcb6e)',
      unlocked: hasNutritionNut,
      progressText: hasNutritionNut ? 'Unlocked' : `${dietCheckins.length}/25 completed`,
      sharingText: '🥗 Nutrition Nut Unlocked! Crushed 25 healthy eating check-ins on Bujo! Wellness starts from within! 🥑🍎',
    },
    {
      id: 'organic-lifestyle',
      title: 'Organic Lifestyle',
      description: 'Completed a nutrition habit 100 times, embodying natural clean eating.',
      icon: 'Sprout',
      color: 'linear-gradient(135deg, #55efc4, #00cec9)',
      unlocked: hasOrganicLifestyle,
      progressText: hasOrganicLifestyle ? 'Unlocked' : `${dietCheckins.length}/100 completed`,
      sharingText: '🌿 Organic Lifestyle Unlocked! 100 healthy meals checked on Bujo! Pure clean living is my standard! 🥑🥗',
    },
    {
      id: 'scholar',
      title: 'Scholar',
      description: 'Completed a learning/reading-centric habit 5 times.',
      icon: 'BookOpen',
      color: 'linear-gradient(135deg, #ffeaa7, #a29bfe)',
      unlocked: hasScholar,
      progressText: hasScholar ? 'Unlocked' : `${learningCheckins.length}/5 completed`,
      sharingText: '📚 Scholar Unlocked! Completed reading/learning habits 5 times on Bujo! Continuous mind growth! 🎓🧠',
    },
    {
      id: 'intellectual',
      title: 'Intellectual',
      description: 'Completed a learning habit 25 times to expand your intellectual horizon.',
      icon: 'GraduationCap',
      color: 'linear-gradient(135deg, #74b9ff, #6c5ce7)',
      unlocked: hasIntellectual,
      progressText: hasIntellectual ? 'Unlocked' : `${learningCheckins.length}/25 completed`,
      sharingText: '🧠 Intellectual Unlocked! Logged learning habits 25 times on Bujo! Sharpening my knowledge and focus! 📚🎓',
    },
    {
      id: 'polymath',
      title: 'Polymath',
      description: 'Completed a learning habit 100 times, mastering diverse domains of study.',
      icon: 'Brain',
      color: 'linear-gradient(135deg, #fd79a8, #6c5ce7)',
      unlocked: hasPolymath,
      progressText: hasPolymath ? 'Unlocked' : `${learningCheckins.length}/100 completed`,
      sharingText: '🎓 Polymath Unlocked! Reached 100 daily study habit checks on Bujo! Lifetime learning and intelligence! 🧠📚',
    },
    {
      id: 'early-riser',
      title: 'Early Riser',
      description: 'Set a habit reminder before 6:30 AM to lock in a productive morning flow.',
      icon: 'Sun',
      color: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)',
      unlocked: hasEarlyRiser,
      progressText: hasEarlyRiser ? 'Unlocked' : '0/1 reminder',
      sharingText: '🌅 Early Riser Unlocked! Custom morning routine reminder set before 6:30 AM on Bujo! Seizing the day! ⏰⏰',
    },
    {
      id: 'dawn-patrol',
      title: 'Dawn Patrol',
      description: 'Set a habit reminder before 5:30 AM, conquering the morning before sunrise.',
      icon: 'Compass',
      color: 'linear-gradient(135deg, #ffeaa7, #e17055)',
      unlocked: hasDawnPatrol,
      progressText: hasDawnPatrol ? 'Unlocked' : '0/1 reminder',
      sharingText: '🧭 Dawn Patrol Unlocked! Conquering my day before the sun rises with a reminder set before 5:30 AM on Bujo! ⏰🛌',
    },
    {
      id: 'midnight-monk',
      title: 'Midnight Monk',
      description: 'Set a habit reminder after 11:00 PM (23:00) to secure late-night reflection.',
      icon: 'Moon',
      color: 'linear-gradient(135deg, #2d3436, #0984e3)',
      unlocked: hasMidnightMonk,
      progressText: hasMidnightMonk ? 'Unlocked' : '0/1 reminder',
      sharingText: '🦉 Midnight Monk Unlocked! Late night reflection checked with a custom Bujo habit reminder set after 11:00 PM! 🌙💭',
    },
    {
      id: 'midday-booster',
      title: 'Midday Booster',
      description: 'Set a habit reminder between 12:00 PM and 2:00 PM for afternoon refocusing.',
      icon: 'Clock',
      color: 'linear-gradient(135deg, #ffeaa7, #55efc4)',
      unlocked: hasMiddayBooster,
      progressText: hasMiddayBooster ? 'Unlocked' : '0/1 reminder',
      sharingText: '⏱️ Midday Booster Unlocked! Keep my afternoon momentum strong with a habit reminder set between 12 and 2 PM on Bujo! 🚀',
    },

    // CATEGORY 5: Diary & Journals Expansion (10 achievements)
    {
      id: 'memory-novice',
      title: 'Memory Novice',
      description: 'Jotted down daily micro-journal highlights/memory notes on 5 separate days.',
      icon: 'BookOpen',
      color: 'linear-gradient(135deg, #ffeaa7, #ff7675)',
      unlocked: hasMemoryNovice,
      progressText: hasMemoryNovice ? 'Unlocked' : `${memories.length}/5 memories`,
      sharingText: '📸 Memory Novice Unlocked! Saved daily memories on 5 separate days on Bujo! Keeping record of my growth! 📖✨',
    },
    {
      id: 'memory-chronicler',
      title: 'Memory Chronicler',
      description: 'Jotted down daily micro-journal memory notes on 15 separate days.',
      icon: 'BookOpen',
      color: 'linear-gradient(135deg, #a29bfe, #fd79a8)',
      unlocked: hasMemoryChronicler,
      progressText: hasMemoryChronicler ? 'Unlocked' : `${memories.length}/15 memories`,
      sharingText: '📖 Memory Chronicler Unlocked! Logged 15 daily highlights on Bujo! Charting my personal story and steps! 📸✨',
    },
    {
      id: 'memory-historian',
      title: 'Memory Historian',
      description: 'Jotted down daily micro-journal memory notes on 30 separate days.',
      icon: 'BookOpen',
      color: 'linear-gradient(135deg, #6c5ce7, #e84393)',
      unlocked: hasMemoryHistorian,
      progressText: hasMemoryHistorian ? 'Unlocked' : `${memories.length}/30 memories`,
      sharingText: '📖 Memory Historian Unlocked! Reached 30 daily journal memory entries on Bujo! Safeguarding my daily moments! 📸💎',
    },
    {
      id: 'memory-collector',
      title: 'Memory Collector',
      description: 'Jotted down daily micro-journal memory notes on 75 separate days.',
      icon: 'Camera',
      color: 'linear-gradient(135deg, #00cec9, #6c5ce7)',
      unlocked: hasMemoryCollector,
      progressText: hasMemoryCollector ? 'Unlocked' : `${memories.length}/75 memories`,
      sharingText: '📸 Memory Collector Unlocked! Preserved daily highlights on 75 separate days on Bujo! Growing day by day! 🌟📖',
    },
    {
      id: 'memory-titan',
      title: 'Memory Titan',
      description: 'Jotted down daily micro-journal memory notes on 150 separate days.',
      icon: 'Trophy',
      color: 'linear-gradient(135deg, #ffeaa7, #2d3436)',
      unlocked: hasMemoryTitan,
      progressText: hasMemoryTitan ? 'Unlocked' : `${memories.length}/150 memories`,
      sharingText: '🏆 Memory Titan Unlocked! Astronomical 150 daily memory notes recorded on Bujo! Absolute master of journaling! 📖✨',
    },
    {
      id: 'unlocked-memories',
      title: 'Unlocked Memories',
      description: 'Connected and synced mock social posts into your daily memories at least 3 times.',
      icon: 'Share',
      color: 'linear-gradient(135deg, #81ecec, #6c5ce7)',
      unlocked: hasUnlockedMemories,
      progressText: hasUnlockedMemories ? 'Unlocked' : `${syncedMemoriesCount}/3 syncs`,
      sharingText: '🔗 Unlocked Memories Unlocked! Synced daily social media highlights into Bujo 3 times! Unifying my diary! 📸✨',
    },
    {
      id: 'social-synchronizer',
      title: 'Social Synchronizer',
      description: 'Connected and synced mock social posts into your daily memories at least 10 times.',
      icon: 'Share',
      color: 'linear-gradient(135deg, #ffeaa7, #6c5ce7)',
      unlocked: hasSocialSynchronizer,
      progressText: hasSocialSynchronizer ? 'Unlocked' : `${syncedMemoriesCount}/10 syncs`,
      sharingText: '🔗 Social Synchronizer Unlocked! Completed 10 social imports into my Bujo daily highlights! Connected growth! 📖✨',
    },
    {
      id: 'detailed-diarist',
      title: 'Detailed Diarist',
      description: 'Logged an intensive micro-journal reflection note containing 200+ characters of content.',
      icon: 'Pencil',
      color: 'linear-gradient(135deg, #55efc4, #00cec9)',
      unlocked: hasDetailedDiarist,
      progressText: hasDetailedDiarist ? 'Unlocked' : '0/1 note',
      sharingText: '✍️ Detailed Diarist Unlocked! Wrote a detailed 200+ character daily memory on Bujo to inspect my reflections! 📖🧠',
    },
    {
      id: 'concise-chronicler',
      title: 'Concise Chronicler',
      description: 'Logged a single short, punchy daily highlight note containing 1 to 40 characters.',
      icon: 'Pencil',
      color: 'linear-gradient(135deg, #ffeaa7, #eb4d4b)',
      unlocked: hasConciseChronicler,
      progressText: hasConciseChronicler ? 'Unlocked' : '0/1 note',
      sharingText: '✍️ Concise Chronicler Unlocked! Logged a short, elegant and punchy daily memory highlight (under 40 chars) on Bujo! ⏱️🌱',
    },
    {
      id: 'weekly-diary-streak',
      title: 'Weekly Diary Streak',
      description: 'Recorded a daily memory note for 7 consecutive days to capture your weeks.',
      icon: 'CalendarDays',
      color: 'linear-gradient(135deg, #ff7675, #6c5ce7)',
      unlocked: hasWeeklyDiaryStreak,
      progressText: hasWeeklyDiaryStreak ? 'Unlocked' : '0/7 days',
      sharingText: '📅 Weekly Diary Streak Unlocked! Maintained a 7-day diary writing streak on Bujo! Capturing the beauty of my days! 📖✨',
    },

    // CATEGORY 6: Social & Circles Expansion (10 achievements)
    {
      id: 'circle-pioneer',
      title: 'Circle Pioneer',
      description: 'Joined or created at least one accountability Circle to sync with friends.',
      icon: 'Users',
      color: 'linear-gradient(135deg, #55efc4, #0984e3)',
      unlocked: hasCirclePioneer,
      progressText: hasCirclePioneer ? 'Unlocked' : '0/1 circle',
      sharingText: '👥 Circle Pioneer Unlocked! Joined my first accountability Circle on Bujo! Growing together with support! 🚀🌱',
    },
    {
      id: 'circle-leader',
      title: 'Circle Leader',
      description: 'Created a new custom accountability Circle to gather close companions.',
      icon: 'Crown',
      color: 'linear-gradient(135deg, #ffeaa7, #0984e3)',
      unlocked: hasCircleLeader,
      progressText: hasCircleLeader ? 'Unlocked' : '0/1 circle',
      sharingText: '👑 Circle Leader Unlocked! Just established a new custom habit circle on Bujo! Inviting friends to grow together! 👥💪',
    },
    {
      id: 'circle-zealot',
      title: 'Circle Zealot',
      description: 'Maintained active membership inside at least 3 separate accountability Circles.',
      icon: 'Users',
      color: 'linear-gradient(135deg, #e84393, #6c5ce7)',
      unlocked: hasCircleZealot,
      progressText: hasCircleZealot ? 'Unlocked' : `${circles.length}/3 circles`,
      sharingText: '👥 Circle Zealot Unlocked! Actively pursuing growth across 3 separate accountability Circles on Bujo! Let\'s go! 🔥👑',
    },
    {
      id: 'cheer-giver',
      title: 'Cheer Giver',
      description: 'Sent 5 cheers to friends or circle mates to reward their efforts.',
      icon: 'Send',
      color: 'linear-gradient(135deg, #ffeaa7, #e84393)',
      unlocked: hasCheerGiver,
      progressText: hasCheerGiver ? 'Unlocked' : `${totalCheersSent}/5 cheers`,
      sharingText: '✨ Cheer Giver Unlocked! Sent 5 encouraging cheers to friends on Bujo! Spreading positive energy! 😄💖',
    },
    {
      id: 'cheer-champion',
      title: 'Cheer Champion',
      description: 'Sent 25 cheers to friends or circle mates, actively celebrating their growth.',
      icon: 'Send',
      color: 'linear-gradient(135deg, #ff7675, #e84393)',
      unlocked: hasCheerChampion,
      progressText: hasCheerChampion ? 'Unlocked' : `${totalCheersSent}/25 cheers`,
      sharingText: '💖 Cheer Champion Unlocked! Sent 25 support cheers to friends on Bujo! Uplifting others on their journey! 🚀🌟',
    },
    {
      id: 'cheer-legend',
      title: 'Cheer Legend',
      description: 'Sent 100 cheers to friends or circle mates, fostering a massive cycle of positive energy.',
      icon: 'PartyPopper',
      color: 'linear-gradient(135deg, #fdcb6e, #e84393)',
      unlocked: hasCheerLegend,
      progressText: hasCheerLegend ? 'Unlocked' : `${totalCheersSent}/100 cheers`,
      sharingText: '🏆 Cheer Legend Unlocked! Fostered 100 positive energy cheers to friends on Bujo! Fulfilling human accountability! 🎉💖',
    },
    {
      id: 'encouragement-magnet',
      title: 'Encouragement Magnet',
      description: 'Received 5 cheers from friends or circle members cheering on your accomplishments.',
      icon: 'Heart',
      color: 'linear-gradient(135deg, #ffeaa7, #e17055)',
      unlocked: hasEncouragementMagnet,
      progressText: hasEncouragementMagnet ? 'Unlocked' : `${totalCheersReceived}/5 cheers`,
      sharingText: '❤️ Encouragement Magnet Unlocked! Received 5 cheers from friends on Bujo! Feeling extremely supported! 😄💖',
    },
    {
      id: 'encouragement-celebrity',
      title: 'Encouragement Celebrity',
      description: 'Received 25 cheers from friends or circle members, a testament to your outstanding progress.',
      icon: 'Crown',
      color: 'linear-gradient(135deg, #ff7675, #6c5ce7)',
      unlocked: hasEncouragementCelebrity,
      progressText: hasEncouragementCelebrity ? 'Unlocked' : `${totalCheersReceived}/25 cheers`,
      sharingText: '👑 Encouragement Celebrity Unlocked! Received 25 awesome cheers from friends on Bujo! Commitment is inspiring! 🚀🔥',
    },
    {
      id: 'friendly-nudge',
      title: 'Friendly Nudge',
      description: 'Sent at least 1 friendly nudge to an inactive friend to encourage accountability.',
      icon: 'Send',
      color: 'linear-gradient(135deg, #55efc4, #2d3436)',
      unlocked: hasFriendlyNudge,
      progressText: hasFriendlyNudge ? 'Unlocked' : '0/1 nudge',
      sharingText: '🛡️ Friendly Nudge Unlocked! Sent a gentle accountability nudge to a friend on Bujo! Keeping each other stable! 👥⏱️',
    },
    {
      id: 'nudge-master',
      title: 'Nudge Master',
      description: 'Sent 8 or more nudges to keep your friends and circles completely on track.',
      icon: 'PartyPopper',
      color: 'linear-gradient(135deg, #fdcb6e, #2d3436)',
      unlocked: hasNudgeMaster,
      progressText: hasNudgeMaster ? 'Unlocked' : `${totalCheersSent}/8 nudges`,
      sharingText: '🏆 Nudge Master Unlocked! Completed 8 accountability nudges to keep my friends active on Bujo! Supporting growth! 👥🔥',
    },
  ]
}

function ProgressView({
  activeHabits,
  checkins,
  moods,
  drinks,
  memories,
  streaks,
  socialInsights,
  prefs,
  onToggle,
  onSetMood,
  onUpdateDrink,
  onSetMemory,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  memories: DailyMemory[]
  streaks: { current: number; best: number; total: number }
  socialInsights: {
    activeFriendsToday: number
    circleCount: number
    circleMomentum: number
    cheersReceivedToday: number
    unreadCount: number
  }
  prefs: NotificationPrefs
  onToggle: (habitId: string, completed: boolean, date: string) => Promise<void>
  onSetMood: (timeOfDay: TimeOfDay, value: MoodValue | null, date: string) => Promise<void>
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink', delta: number, date: string) => Promise<void>
  onSetMemory: (text: string, date: string) => Promise<void>
}) {
  const [subTab, setSubTab] = useState<'overview' | 'habits' | 'wellness'>('overview')
  const [sortOrder, setSortOrder] = useState<'rate-desc' | 'rate-asc' | 'name'>('rate-desc')

  const weekKeys = useMemo(() => getWeekDateKeys(), [])
  const recentKeys = useMemo(() => getRecentDateKeys(14), [])
  const rhythmKeys = useMemo(() => getRecentDateKeys(28), [])
  const currentSevenKeys = useMemo(() => recentKeys.slice(7), [recentKeys])
  const previousSevenKeys = useMemo(() => recentKeys.slice(0, 7), [recentKeys])
  const dateLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const activeHabitIds = useMemo(() => new Set(activeHabits.map((habit) => habit.id)), [activeHabits])
  const activeCheckins = useMemo(
    () => checkins.filter((checkin) => activeHabitIds.has(checkin.habitId)),
    [activeHabitIds, checkins],
  )
  const doneIdsForDate = useCallback(
    (dateKey: string) => getDoneIdsForDate(activeCheckins, dateKey),
    [activeCheckins],
  )
  const dayRate = useCallback((dateKey: string) => {
    if (!activeHabits.length) return 0
    return Math.round((doneIdsForDate(dateKey).size / activeHabits.length) * 100)
  }, [activeHabits.length, doneIdsForDate])
  const analytics = useMemo(
    () =>
      buildDashboardAnalytics({
        activeHabits,
        checkins,
        moods,
        drinks,
        currentSevenKeys,
        previousSevenKeys,
        recentKeys,
        rhythmKeys,
      }),
    [activeHabits, checkins, currentSevenKeys, drinks, moods, previousSevenKeys, recentKeys, rhythmKeys],
  )
  const {
    currentRate,
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
  } = analytics

  // --- Mood Distribution Calculations (Wellness sub-tab) ---
  const moodCounts = useMemo(() => {
    const counts = { great: 0, good: 0, okay: 0, bad: 0, terrible: 0 }
    moods.forEach((m) => {
      const v = m.value as keyof typeof counts
      if (v in counts) {
        counts[v]++
      }
    })
    return counts
  }, [moods])

  const totalMoodLogs = useMemo(() => {
    return moodCounts.great + moodCounts.good + moodCounts.okay + moodCounts.bad + moodCounts.terrible
  }, [moodCounts])

  // --- Beverage Volume Calculations (Wellness sub-tab) ---
  const beverageTotals = useMemo(() => {
    const totals = { water: 0, coffee: 0, alcohol: 0, wine: 0, softdrink: 0 }
    drinks.forEach((d) => {
      totals.water += d.water ?? 0
      totals.coffee += d.coffee ?? 0
      totals.alcohol += d.alcohol ?? 0
      totals.wine += d.wine ?? 0
      totals.softdrink += d.softdrink ?? 0
    })
    return totals
  }, [drinks])

  const totalDrinksLogged = useMemo(() => {
    return (
      beverageTotals.water +
      beverageTotals.coffee +
      beverageTotals.alcohol +
      beverageTotals.wine +
      beverageTotals.softdrink
    )
  }, [beverageTotals])

  // --- Habits Sorting Logic (Habits sub-tab) ---
  const sortedBreakdown = useMemo(() => {
    const list = [...habitBreakdown]
    if (sortOrder === 'rate-desc') {
      return list.sort((a, b) => b.rate - a.rate)
    }
    if (sortOrder === 'rate-asc') {
      return list.sort((a, b) => a.rate - b.rate)
    }
    return list.sort((a, b) => a.habit.name.localeCompare(b.habit.name))
  }, [habitBreakdown, sortOrder])

  return (
    <section className="screen-stack" aria-label="Progress">
      {/* Sub-tab segmented controller */}
      <div className="progress-subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSubTab('overview')}
        >
          <Home size={15} />
          Overview
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'habits' ? 'active' : ''}`}
          onClick={() => setSubTab('habits')}
        >
          <Target size={15} />
          Habits
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'wellness' ? 'active' : ''}`}
          onClick={() => setSubTab('wellness')}
        >
          <Smile size={15} />
          Wellness
        </button>
      </div>

      {/* RENDER OVERVIEW SUB-TAB */}
      {subTab === 'overview' && (
        <div className="screen-stack animate-fade-up-stagger" style={{ animationDelay: '0.05s' }}>
          <div className="insight-hero">
            <div>
              <p className="panel-kicker">{dashboardMood}</p>
              <h2>{currentRate}%</h2>
            </div>
            <span className={trend >= 0 ? 'trend-pill positive' : 'trend-pill negative'}>
              {trend >= 0 ? '+' : ''}
              {trend}
            </span>
          </div>

          <div className="insight-grid">
            <Metric icon={Flame} label="Current streak" value={`${streaks.current}d`} />
            <Metric icon={BarChart3} label="Consistency" value={`${consistencyScore}%`} />
            <Metric icon={Check} label="Perfect days" value={`${perfectDays}/7`} />
          </div>

          <div className="coach-focus-card">
            <div className="section-heading">
              <h2>Today's focus</h2>
              <span>{riskHabits.length ? `${riskHabits.length} needs care` : 'Clear'}</span>
            </div>
            <p>{todayFocus}</p>
            <small>{weeklyReview}</small>
          </div>

          <div className="social-insight-grid">
            <Metric icon={Users} label="Active friends" value={`${socialInsights.activeFriendsToday}`} />
            <Metric icon={Target} label="Circle momentum" value={`${socialInsights.circleMomentum}%`} />
            <Metric icon={Inbox} label="Unread" value={`${socialInsights.unreadCount}`} />
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <h2>Rhythm</h2>
              <span>{lastThreeRate}% Momentum</span>
            </div>
            <div className="momentum-strip" aria-label="Last 14 days completion">
              {recentKeys.map((dateKey) => {
                const rate = dayRate(dateKey)
                return (
                  <div className="momentum-day" key={dateKey}>
                    <span style={{ height: `${Math.max(8, rate)}%` }} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <h2>Weekly Trend</h2>
              <span>{activeHabits.length} Active Habits</span>
            </div>
            <div className="week-grid">
              {weekKeys.map((dateKey, index) => {
                const count = checkins.filter(
                  (checkin) =>
                    checkin.date === dateKey && activeHabits.some((habit) => habit.id === checkin.habitId),
                ).length
                const height = activeHabits.length
                  ? Math.max(10, Math.round((count / activeHabits.length) * 54))
                  : 10

                return (
                  <div className="week-day" key={dateKey}>
                    <div className="bar-track">
                      <span style={{ height }} />
                    </div>
                    <small>{dateLabels[index]}</small>
                  </div>
                )
              })}
            </div>
          </div>

          <ActivityCalendar
            activeHabits={activeHabits}
            checkins={checkins}
            moods={moods}
            drinks={drinks}
            memories={memories}
            prefs={prefs}
            onToggle={onToggle}
            onSetMood={onSetMood}
            onUpdateDrink={onUpdateDrink}
            onSetMemory={onSetMemory}
            doneIdsForDate={doneIdsForDate}
          />
        </div>
      )}

      {/* RENDER HABITS ANALYTICS SUB-TAB */}
      {subTab === 'habits' && (
        <div className="screen-stack animate-fade-up-stagger" style={{ animationDelay: '0.05s' }}>
          {activeHabits.length > 0 && (
            <div className="insight-pair">
              <div className="mini-insight">
                <span>Strongest Habit</span>
                <strong>{strongestHabit?.habit.name ?? '—'}</strong>
                <p>{strongestHabit ? `${strongestHabit.rate}% Completion` : ''}</p>
              </div>
              <div className="mini-insight">
                <span>Focus Habit</span>
                <strong>{focusHabit?.habit.name ?? '—'}</strong>
                <p>{focusHabit ? `${focusHabit.rate}% Completion` : ''}</p>
              </div>
            </div>
          )}

          <div className="panel-section">
            <div className="section-heading">
              <h2>7-Day Performance Grid</h2>
              <span>All Habits Matrix</span>
            </div>
            <div className="matrix-scroll-wrapper">
              <div className="habit-matrix">
                <div className="matrix-header">
                  <div className="matrix-label"></div>
                  {currentSevenKeys.map((dateKey, index) => (
                    <div key={dateKey} className="matrix-day-label">
                      {dateLabels[index]}
                    </div>
                  ))}
                </div>
                {activeHabits.map((habit) => (
                  <div className="matrix-row" key={habit.id}>
                    <div className="matrix-label">
                      <HabitIdentity habit={habit} />
                    </div>
                    {currentSevenKeys.map((dateKey) => {
                      const isDone = doneIdsForDate(dateKey).has(habit.id)
                      return (
                        <div
                          key={`${habit.id}-${dateKey}`}
                          className={`matrix-cell ${isDone ? `done ${habit.color}` : ''}`}
                        >
                          {isDone && <Check size={14} strokeWidth={3} />}
                        </div>
                      )
                    })}
                  </div>
                ))}
                {activeHabits.length === 0 && (
                  <p className="helper-copy" style={{ padding: '8px 0' }}>
                    Add a habit to see your 7-day performance grid.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="coach-grid">
            <div className="coach-card">
              <span>Best Day</span>
              <strong>{bestDay?.rate ? bestDay.dateKey.slice(5).replace('-', '/') : '—'}</strong>
              <p>{bestDay?.rate ? `${bestDay.rate}% checks` : ''}</p>
            </div>
            <div className="coach-card">
              <span>Best Rhythm</span>
              <strong>{bestWeekday?.rate ? bestWeekday.label : '—'}</strong>
              <p>{bestWeekday?.rate ? `${bestWeekday.rate}% checks` : ''}</p>
            </div>
            <div className="coach-card">
              <span>Attention Needed</span>
              <strong>{weakestWeekday?.rate ? weakestWeekday.label : focusHabit?.habit.name ?? '—'}</strong>
              <p>{weakestWeekday?.rate ? `${weakestWeekday.rate}% rhythm` : focusHabit ? `${focusHabit.rate}%` : ''}</p>
            </div>
          </div>

          <div className="panel-section">
            <div className="sort-control-container">
              <span className="sort-label">Habit Health</span>
              <div className="sort-btn-group">
                <button
                  type="button"
                  onClick={() => setSortOrder('rate-desc')}
                  className={`sort-btn ${sortOrder === 'rate-desc' ? 'active' : ''}`}
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('rate-asc')}
                  className={`sort-btn ${sortOrder === 'rate-asc' ? 'active' : ''}`}
                >
                  Low
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('name')}
                  className={`sort-btn ${sortOrder === 'name' ? 'active' : ''}`}
                >
                  Name
                </button>
              </div>
            </div>

            <div className="habit-health-list">
              {sortedBreakdown.length === 0 ? (
                <InlineMessage message="Your per-habit insight will appear after you add a habit." />
              ) : (
                sortedBreakdown.map(({ habit, recentDone, rate, habitStreak, targetTotal }) => {
                  const healthStatus = rate >= 80 ? 'thriving' : rate >= 50 ? 'stable' : 'needs-care'
                  const healthText = rate >= 80 ? 'Thriving' : rate >= 50 ? 'Stable' : 'Needs Care'
                  return (
                    <div className="health-row" key={habit.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <HabitIdentity habit={habit} />
                        <span className={`health-badge ${healthStatus}`}>{healthText}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div className="health-meter" aria-label={`${habit.name} completion ${rate}%`} style={{ flexGrow: 1, margin: 0 }}>
                          <span className={habit.color} style={{ width: `${rate}%` }} />
                        </div>
                        <strong style={{ fontSize: '13px', width: '38px', textAlign: 'right' }}>{rate}%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Streak: {habitStreak}d</span>
                        <span>
                          {isWeeklyHabit(habit) ? `${recentDone}/${targetTotal} target` : `${recentDone}/14 checks`}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <h2>Risk Radar</h2>
              <span>Next Best Wins</span>
            </div>
            <div className="risk-list">
              {riskHabits.length === 0 ? (
                <InlineMessage message="Everything looks steady. Keep check-ins tiny and repeatable." />
              ) : (
                riskHabits.map(({ habit, rate, habitStreak, risk }) => (
                  <div className={`risk-row ${risk}`} key={habit.id}>
                    <HabitIdentity habit={habit} />
                    <span>{rate}%</span>
                    <small>{habitStreak}d streak</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER WELLNESS & JOURNAL SUB-TAB */}
      {subTab === 'wellness' && (
        <div className="screen-stack animate-fade-up-stagger" style={{ animationDelay: '0.05s' }}>
          {/* Reflections summary card */}
          <div className="coach-focus-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <div className="section-heading">
              <h2>Mental Space</h2>
              <span>{memories.length} notes</span>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
              You have kept exactly <strong>{memories.length} daily journals</strong> since beginning Bujo. Linking notes with daily checks establishes high self-awareness.
            </p>
          </div>

          {/* Mood Distribution */}
          <div className="wellness-distribution-card">
            <span className="wellness-distribution-title">Mood Breakdown (Historical)</span>
            <div className="wellness-bar-chart">
              {totalMoodLogs > 0 ? (
                <>
                  <span
                    className="wellness-bar-segment great"
                    style={{ width: `${(moodCounts.great / totalMoodLogs) * 100}%` }}
                    title={`Great: ${moodCounts.great}`}
                  />
                  <span
                    className="wellness-bar-segment good"
                    style={{ width: `${(moodCounts.good / totalMoodLogs) * 100}%` }}
                    title={`Good: ${moodCounts.good}`}
                  />
                  <span
                    className="wellness-bar-segment okay"
                    style={{ width: `${(moodCounts.okay / totalMoodLogs) * 100}%` }}
                    title={`Okay: ${moodCounts.okay}`}
                  />
                  <span
                    className="wellness-bar-segment bad"
                    style={{ width: `${(moodCounts.bad / totalMoodLogs) * 100}%` }}
                    title={`Bad: ${moodCounts.bad}`}
                  />
                  <span
                    className="wellness-bar-segment terrible"
                    style={{ width: `${(moodCounts.terrible / totalMoodLogs) * 100}%` }}
                    title={`Terrible: ${moodCounts.terrible}`}
                  />
                </>
              ) : (
                <span style={{ width: '100%', display: 'block', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', lineHeight: '14px' }}>No moods logged yet</span>
              )}
            </div>
            <div className="wellness-bar-legend" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div className="wellness-legend-item">
                <span className="wellness-legend-color-dot great" />
                <span className="wellness-legend-label">Great</span>
                <span className="wellness-legend-count">{moodCounts.great} ({totalMoodLogs ? Math.round((moodCounts.great / totalMoodLogs) * 100) : 0}%)</span>
              </div>
              <div className="wellness-legend-item">
                <span className="wellness-legend-color-dot good" />
                <span className="wellness-legend-label">Good</span>
                <span className="wellness-legend-count">{moodCounts.good} ({totalMoodLogs ? Math.round((moodCounts.good / totalMoodLogs) * 100) : 0}%)</span>
              </div>
              <div className="wellness-legend-item">
                <span className="wellness-legend-color-dot meh okay" style={{ background: '#f59e0b' }} />
                <span className="wellness-legend-label">Okay</span>
                <span className="wellness-legend-count">{moodCounts.okay} ({totalMoodLogs ? Math.round((moodCounts.okay / totalMoodLogs) * 100) : 0}%)</span>
              </div>
              <div className="wellness-legend-item">
                <span className="wellness-legend-color-dot frown bad" style={{ background: '#f97316' }} />
                <span className="wellness-legend-label">Bad</span>
                <span className="wellness-legend-count">{moodCounts.bad} ({totalMoodLogs ? Math.round((moodCounts.bad / totalMoodLogs) * 100) : 0}%)</span>
              </div>
              <div className="wellness-legend-item">
                <span className="wellness-legend-color-dot terrible" style={{ background: '#ef4444' }} />
                <span className="wellness-legend-label">Terrible</span>
                <span className="wellness-legend-count">{moodCounts.terrible} ({totalMoodLogs ? Math.round((moodCounts.terrible / totalMoodLogs) * 100) : 0}%)</span>
              </div>
            </div>
          </div>

          {/* Daily Mood Trend for the last 7 days */}
          <div className="panel-section">
            <div className="section-heading">
              <h2>Reflective Trends</h2>
              <span>Last 7 Days Moods</span>
            </div>
            <div className="wellness-trend-row">
              {currentSevenKeys.map((dateKey, index) => {
                const dayMood = moods.find((m) => m.date === dateKey)
                let IconComp: LucideIcon | null = null
                let iconClass = ''
                if (dayMood?.value === 'great') {
                  IconComp = Laugh
                  iconClass = 'great-mood-color'
                } else if (dayMood?.value === 'good') {
                  IconComp = Smile
                  iconClass = 'good-mood-color'
                } else if (dayMood?.value === 'okay') {
                  IconComp = Meh
                  iconClass = 'okay-mood-color'
                } else if (dayMood?.value === 'bad') {
                  IconComp = Frown
                  iconClass = 'bad-mood-color'
                } else if (dayMood?.value === 'terrible') {
                  IconComp = CloudRain
                  iconClass = 'terrible-mood-color'
                }

                return (
                  <div className="wellness-trend-cell" key={dateKey}>
                    <span className="wellness-trend-day-lbl">{dateLabels[index]}</span>
                    {IconComp ? (
                      <span className={`wellness-trend-val ${iconClass}`}>
                        <IconComp size={20} />
                      </span>
                    ) : (
                      <span className="wellness-trend-val empty" title="No log" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Beverage Gauge */}
          <div className="beverage-gauge-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Beverage Intake Ratio</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{beverageTotals.water} cups water</span>
            </div>
            <div className="beverage-ratio-track">
              {totalDrinksLogged > 0 ? (
                <>
                  <span
                    className="beverage-ratio-segment water"
                    style={{ width: `${(beverageTotals.water / totalDrinksLogged) * 100}%` }}
                    title={`Water: ${beverageTotals.water}`}
                  />
                  <span
                    className="beverage-ratio-segment coffee"
                    style={{ width: `${(beverageTotals.coffee / totalDrinksLogged) * 100}%` }}
                    title={`Coffee: ${beverageTotals.coffee}`}
                  />
                  <span
                    className="beverage-ratio-segment softdrink"
                    style={{ width: `${(beverageTotals.softdrink / totalDrinksLogged) * 100}%` }}
                    title={`Softdrink: ${beverageTotals.softdrink}`}
                  />
                  <span
                    className="beverage-ratio-segment wine"
                    style={{ width: `${(beverageTotals.wine / totalDrinksLogged) * 100}%` }}
                    title={`Wine: ${beverageTotals.wine}`}
                  />
                  <span
                    className="beverage-ratio-segment alcohol"
                    style={{ width: `${(beverageTotals.alcohol / totalDrinksLogged) * 100}%` }}
                    title={`Alcohol: ${beverageTotals.alcohol}`}
                  />
                </>
              ) : (
                <span style={{ width: '100%', display: 'block', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', lineHeight: '14px' }}>No drinks logged yet</span>
              )}
            </div>
            <div className="beverage-legend">
              <div className="beverage-legend-item">
                <span className="beverage-legend-color water" />
                <span className="beverage-legend-text">Water: <strong>{beverageTotals.water}</strong></span>
              </div>
              <div className="beverage-legend-item">
                <span className="beverage-legend-color coffee" />
                <span className="beverage-legend-text">Coffee: <strong>{beverageTotals.coffee}</strong></span>
              </div>
              <div className="beverage-legend-item">
                <span className="beverage-legend-color softdrink" />
                <span className="beverage-legend-text">Soda: <strong>{beverageTotals.softdrink}</strong></span>
              </div>
              <div className="beverage-legend-item">
                <span className="beverage-legend-color wine" />
                <span className="beverage-legend-text">Wine: <strong>{beverageTotals.wine}</strong></span>
              </div>
              <div className="beverage-legend-item">
                <span className="beverage-legend-color alcohol" />
                <span className="beverage-legend-text">Sober: <strong>{beverageTotals.alcohol}</strong></span>
              </div>
            </div>
          </div>

          {/* Coach Wellness Signals */}
          <div className="panel-section">
            <div className="section-heading">
              <h2>Signals & Diagnostics</h2>
              <span>Coach Insights</span>
            </div>
            <div className="signal-list">
              <p>{moodInsight}</p>
              <p>{hydrationInsight}</p>
              <p>
                {socialInsights.circleCount
                  ? `${socialInsights.circleCount} active accountability circle${
                      socialInsights.circleCount === 1 ? '' : 's'
                    } currently backing your progress.`
                  : 'Join or create an accountability circle to share positive wellness loops.'}
              </p>
              <p>
                {socialInsights.cheersReceivedToday
                  ? `You received ${socialInsights.cheersReceivedToday} cheering notification${
                      socialInsights.cheersReceivedToday === 1 ? '' : 's'
                    } from friends today.`
                  : 'Send cheers to circles to spark mutual positive support.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function AchievementsView({
  activeHabits,
  checkins,
  moods,
  drinks,
  memories,
  prefs,
  currentStreak,
  circles = [],
  friends = [],
  cheersSent = [],
  cheersReceived = [],
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  memories: DailyMemory[]
  prefs: NotificationPrefs
  currentStreak: number
  circles?: Circle[]
  friends?: FriendProfile[]
  cheersSent?: Cheer[]
  cheersReceived?: Cheer[]
}) {
  const achievements = useMemo(() => {
    return computeAchievements(
      activeHabits,
      checkins,
      moods,
      drinks,
      currentStreak,
      memories,
      prefs,
      circles,
      friends,
      cheersSent,
      cheersReceived
    )
  }, [
    activeHabits,
    checkins,
    moods,
    drinks,
    currentStreak,
    memories,
    prefs,
    circles,
    friends,
    cheersSent,
    cheersReceived,
  ])

  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <section className="screen-stack" aria-label="Achievements">
      <div className="hero-panel" style={{ background: 'var(--theme-color)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div>
          <p className="panel-kicker" style={{ color: 'rgba(255,255,255,0.85)', margin: 0 }}>Unlock your growth</p>
          <h2 style={{ fontSize: '24px', margin: '4px 0 0' }}>{unlockedCount}/{achievements.length} Badges Unlocked</h2>
        </div>
        <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.18 }}>
          <Trophy size={64} />
        </div>
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Your Trophy Case</h2>
        </div>
        <div className="achievements-shelf" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {achievements.map((achievement) => {
            const Icon = achievementIcons[achievement.icon] ?? Trophy
            return (
              <button
                key={achievement.id}
                type="button"
                className={`achievement-badge-btn ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                style={{ '--badge-color': achievement.color } as CSSVariableProperties}
                onClick={() => setSelectedAchievement(achievement)}
                aria-label={`View achievement ${achievement.title}`}
              >
                <div className="achievement-badge-circle">
                  <Icon size={22} />
                </div>
                <span className="achievement-badge-title">{achievement.title}</span>
                <span className="achievement-badge-progress">{achievement.progressText}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedAchievement && (
        <AchievementCardModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </section>
  )
}

function SettingsView({
  photoURL,
  displayName,
  email,
  prefs,
  onEnableReminders,
  onDisableReminders,
  onSavePrefs,
  onConnectSocial,
  onSignOut,
}: {
  photoURL?: string | null
  displayName?: string | null
  email?: string | null
  prefs: NotificationPrefs
  onEnableReminders: () => Promise<void>
  onDisableReminders: () => Promise<void>
  onSavePrefs: (updates: Partial<NotificationPrefs>) => Promise<void>
  onConnectSocial: (platform: 'instagram' | 'facebook' | 'tiktok', connect: boolean) => void
  onSignOut: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setSaving(true)
    try {
      await action()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="screen-stack" aria-label="Settings">
      <div className="profile-row">
        {photoURL ? <img src={photoURL} alt="" /> : <div className="avatar-fallback">{displayName?.charAt(0) ?? 'B'}</div>}
        <div>
          <strong>{displayName ?? 'Bujo user'}</strong>
          <span>{email}</span>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Reminders</h2>
          {prefs.enabled ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <button
          className={prefs.enabled ? 'secondary-action' : 'primary-action'}
          type="button"
          disabled={saving}
          onClick={() => run(prefs.enabled ? onDisableReminders : onEnableReminders)}
        >
          {prefs.enabled ? <BellOff size={20} /> : <Bell size={20} />}
          <span>{prefs.enabled ? 'Disable' : 'Enable'}</span>
        </button>
        <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--muted)', lineHeight: '1.4' }}>
          {getNotificationHelpText()}
        </p>
      </div>

      {prefs.enabled && (
        <div className="panel-section">
          <div className="section-heading">
            <h2>Sound</h2>
          </div>
          <select
            className="sound-select"
            value={prefs.sound || 'default'}
            onChange={(e) => run(() => onSavePrefs({ sound: e.target.value }))}
            disabled={saving}
          >
            <option value="default">Default</option>
            <option value="chime.aiff">Chime</option>
            <option value="bell.aiff">Bell</option>
            <option value="birds.aiff">Birds</option>
          </select>
        </div>
      )}

      <div className="panel-section">
        <div className="section-heading">
          <h2>Appearance</h2>
        </div>
        <div className="picker-group">
          <div className="compact-label">
            <span>Theme</span>
          </div>
          <select
            className="sound-select"
            value={prefs.theme || 'system'}
            onChange={(e) => {
              const nextTheme = e.target.value
              if (nextTheme === 'system' || nextTheme === 'light' || nextTheme === 'dark') {
                run(() => onSavePrefs({ theme: nextTheme }))
              }
            }}
            disabled={saving}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>

          <div className="compact-label" style={{ marginTop: '8px' }}>
            <span>Primary Color</span>
          </div>
          <div className="theme-color-picker">
            {[
              { label: 'Blue', value: '#2878ff' },
              { label: 'Green', value: '#2aa86b' },
              { label: 'Violet', value: '#8d6dff' },
              { label: 'Coral', value: '#ff6f61' },
              { label: 'Gold', value: '#d69d16' },
              { label: 'Teal', value: '#12a7a1' },
              { label: 'Pink', value: '#ef5da8' },
              { label: 'Indigo', value: '#4f68ff' },
              { label: 'Amber', value: '#e67e22' },
              { label: 'Mint', value: '#2ecc8e' },
              { label: 'Gray', value: '#7b8492' },
              { label: 'Rose', value: '#ff4757' },
              { label: 'Sunset', value: '#ff7f50' },
              { label: 'Lavender', value: '#a55eea' },
              { label: 'Turquoise', value: '#00d2d3' },
              { label: 'Sky', value: '#54a0ff' },
              { label: 'Forest', value: '#20bf6b' },
              { label: 'Crimson', value: '#e84118' },
            ].map((colorOpt) => (
              <button
                key={colorOpt.value}
                className="theme-color-btn"
                type="button"
                onClick={() => run(() => onSavePrefs({ themeColor: colorOpt.value }))}
                style={{ background: colorOpt.value, color: '#fff', borderColor: prefs.themeColor === colorOpt.value || (!prefs.themeColor && colorOpt.value === '#2878ff') ? 'var(--text)' : 'transparent' }}
                aria-label={colorOpt.label}
              >
                {(prefs.themeColor === colorOpt.value || (!prefs.themeColor && colorOpt.value === '#2878ff')) && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Social Sync (Concept)</h2>
        </div>
        <p className="section-desc" style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '-8px', marginBottom: '12px' }}>
          Connect platforms to sync your daily posts and media as memories.
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {/* Instagram */}
          <div className="social-connect-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <InstagramIcon size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Instagram</strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {prefs.socialConnectedInstagram ? 'Connected as @bujo_explorer' : 'Not connected'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={prefs.socialConnectedInstagram ? 'secondary-action compact-action' : 'primary-action compact-action'}
              style={{ margin: 0, padding: '6px 12px', fontSize: '13px', minHeight: 'auto', width: 'auto' }}
              onClick={() => onConnectSocial('instagram', !prefs.socialConnectedInstagram)}
            >
              {prefs.socialConnectedInstagram ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* TikTok */}
          <div className="social-connect-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Video size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>TikTok</strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {prefs.socialConnectedTiktok ? 'Connected as @bujo_creator' : 'Not connected'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={prefs.socialConnectedTiktok ? 'secondary-action compact-action' : 'primary-action compact-action'}
              style={{ margin: 0, padding: '6px 12px', fontSize: '13px', minHeight: 'auto', width: 'auto' }}
              onClick={() => onConnectSocial('tiktok', !prefs.socialConnectedTiktok)}
            >
              {prefs.socialConnectedTiktok ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* Facebook */}
          <div className="social-connect-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <FacebookIcon size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Facebook</strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {prefs.socialConnectedFacebook ? 'Connected as Bujo Explorer' : 'Not connected'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={prefs.socialConnectedFacebook ? 'secondary-action compact-action' : 'primary-action compact-action'}
              style={{ margin: 0, padding: '6px 12px', fontSize: '13px', minHeight: 'auto', width: 'auto' }}
              onClick={() => onConnectSocial('facebook', !prefs.socialConnectedFacebook)}
            >
              {prefs.socialConnectedFacebook ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      <button className="secondary-action danger" type="button" onClick={onSignOut}>
        <LogOut size={20} />
        <span>Sign out</span>
      </button>
    </section>
  )
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  )
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}

function TiktokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tiktok">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
    </svg>
  )
}

function SimulatedOauthModal({
  platform,
  onClose,
  onAuthorize,
}: {
  platform: 'instagram' | 'facebook' | 'tiktok'
  onClose: () => void
  onAuthorize: () => Promise<void>
}) {
  const [authorizing, setAuthorizing] = useState(false)

  const handleAuthorize = async () => {
    setAuthorizing(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await onAuthorize()
  }

  const brandStyles: Record<typeof platform, { bg: string; iconBg: string; name: string; icon: React.ReactNode }> = {
    instagram: {
      bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      iconBg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      name: 'Instagram',
      icon: <InstagramIcon size={32} />,
    },
    tiktok: {
      bg: '#000000',
      iconBg: '#000000',
      name: 'TikTok',
      icon: <Video size={32} />,
    },
    facebook: {
      bg: '#1877f2',
      iconBg: '#1877f2',
      name: 'Facebook',
      icon: <FacebookIcon size={32} />,
    },
  }

  const brand = brandStyles[platform]

  return (
    <div className="oauth-backdrop">
      <div className="oauth-window">
        <header className="oauth-header" style={{ background: brand.bg }}>
          <div className="oauth-brand-icon">
            {brand.icon}
          </div>
          <h2>Connect {brand.name} to Bujo</h2>
        </header>
        <div className="oauth-body">
          {authorizing ? (
            <div className="oauth-loading">
              <div className="spinner" />
              <p>Establishing secure connection...</p>
            </div>
          ) : (
            <>
              <p className="oauth-desc">
                <strong>Bujo</strong> is requesting permission to access your {brand.name} account to learn about your days and import activity.
              </p>
              <div className="oauth-permissions">
                <h3>Permitted Access:</h3>
                <ul>
                  <li>
                    <strong>Read profile info</strong>
                    <span>To link your public handle and avatar.</span>
                  </li>
                  <li>
                    <strong>Read posts & media</strong>
                    <span>To fetch and display your daily updates inside the history calendar.</span>
                  </li>
                </ul>
              </div>
              <div className="oauth-warning-card">
                <p>
                  🛡️ <strong>Privacy First:</strong> Your credentials are never stored. The connection is fully simulated for development.
                </p>
              </div>
              <div className="oauth-actions">
                <button type="button" className="secondary-action" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="primary-action" style={{ background: brand.bg, borderColor: 'transparent', color: '#fff' }} onClick={handleAuthorize}>
                  Authorize Access
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function HabitSheet({
  habit,
  circles,
  onClose,
  onSave,
}: {
  habit: Habit | null
  circles: Circle[]
  onClose: () => void
  onSave: (input: NewHabitInput) => Promise<void>
}) {
  const [input, setInput] = useState<NewHabitInput>(() => habitToInput(habit))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [iconSearch, setIconSearch] = useState('')
  const filteredIcons = useMemo(() => {
    return (Object.keys(habitIcons) as HabitIcon[]).filter((iconKey) => {
      if (!iconSearch) return true
      const query = iconSearch.toLowerCase()
      const nameMatch = iconKey.toLowerCase().includes(query)
      const tags = iconTags[iconKey] || []
      const tagMatch = tags.some((tag) => tag.toLowerCase().includes(query))
      return nameMatch || tagMatch
    })
  }, [iconSearch])
  const canSave = input.name.trim().length > 0
  const weeklyTarget = normalizeWeeklyTarget(input.weeklyTarget)
  const adjustWeeklyTarget = (amount: number) => {
    setInput((current) => ({
      ...current,
      weeklyTarget: normalizeWeeklyTarget(current.weeklyTarget + amount),
    }))
  }
  const toggleWeeklyDay = (day: WeekDay) => {
    setInput((current) => {
      const has = current.weeklyDays.includes(day)
      const next = has ? current.weeklyDays.filter((d) => d !== day) : [...current.weeklyDays, day].sort()
      return { ...current, weeklyDays: next }
    })
  }
  const setShareLevel = (shareLevel: NewHabitInput['shareLevel']) => {
    setInput((current) => ({
      ...current,
      shareLevel,
      sharedCircleIds: shareLevel === 'circles' ? current.sharedCircleIds.filter((id) => circles.some((circle) => circle.id === id)) : [],
    }))
  }
  const toggleSharedCircle = (circleId: string) => {
    setInput((current) => {
      const hasCircle = current.sharedCircleIds.includes(circleId)
      return {
        ...current,
        sharedCircleIds: hasCircle
          ? current.sharedCircleIds.filter((id) => id !== circleId)
          : [...current.sharedCircleIds, circleId],
      }
    })
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <form
        className="sheet"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!canSave) return

          setSaving(true)
          setSaveError(null)
          try {
            await onSave(input)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not save this habit right now.'
            setSaveError(message)
          } finally {
            setSaving(false)
          }
        }}
      >
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>{habit ? 'Edit habit' : ''}</h2>
          <button className="icon-button quiet" type="button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <label className="text-field">
          <span>Name</span>
          <input
            autoFocus
            maxLength={28}
            placeholder="Morning walk"
            value={input.name}
            onChange={(event) => setInput((current) => ({ ...current, name: event.target.value }))}
          />
        </label>

        {saveError && <InlineMessage tone="warning" message={saveError} />}

        <div className="picker-group">
          <div className="compact-label" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <span>Icon</span>
            <input
              type="text"
              placeholder="Search icons..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              className="icon-search-input"
            />
          </div>
          <div className="icon-picker">
            {filteredIcons.map((iconKey) => {
              const Icon = habitIcons[iconKey]
              return (
                <button
                  key={iconKey}
                  className={input.icon === iconKey ? 'picker active' : 'picker'}
                  type="button"
                  aria-label={iconKey}
                  onClick={() => setInput((current) => ({ ...current, icon: iconKey }))}
                >
                  <Icon size={20} />
                </button>
              )
            })}
            {filteredIcons.length === 0 && (
              <p className="helper-copy" style={{ width: '100%', padding: '4px 0', fontSize: '13px', color: 'var(--subtle)' }}>No matching icons found.</p>
            )}
          </div>
        </div>

        <div className="picker-group">
          <div className="compact-label">
            <span>Color</span>
            <small>{colorNames[input.color]}</small>
          </div>
          <div className="color-picker">
            {(Object.keys(colorNames) as HabitColor[]).map((color) => (
              <button
                key={color}
                className={input.color === color ? `swatch ${color} active` : `swatch ${color}`}
                type="button"
                aria-label={colorNames[color]}
                onClick={() => setInput((current) => ({ ...current, color }))}
              />
            ))}
          </div>
        </div>

        <div className="cadence-card">
          <div className="segmented-control" aria-label="Habit cadence">
            <button
              className={input.frequency === 'daily' ? 'active' : ''}
              type="button"
              onClick={() => setInput((current) => ({ ...current, frequency: 'daily' }))}
            >
              Daily
            </button>
            <button
              className={input.frequency === 'weekly' ? 'active' : ''}
              type="button"
              onClick={() => setInput((current) => ({ ...current, frequency: 'weekly', weeklyTarget }))}
            >
              Weekly
            </button>
          </div>
          {input.frequency === 'weekly' && (
            <>
            <div className="target-stepper">
              <span>
                <CalendarDays size={16} />
                Target
              </span>
              <button type="button" onClick={() => adjustWeeklyTarget(-1)} aria-label="Decrease weekly target">
                -
              </button>
              <strong>{weeklyTarget}x</strong>
              <button type="button" onClick={() => adjustWeeklyTarget(1)} aria-label="Increase weekly target">
                +
              </button>
            </div>
            <div className="day-picker">
              <span>Days</span>
              <div className="day-chips">
                {([0, 1, 2, 3, 4, 5, 6] as WeekDay[]).map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={input.weeklyDays.includes(day) ? 'day-chip active' : 'day-chip'}
                    onClick={() => toggleWeeklyDay(day)}
                    aria-label={WEEKDAY_SHORT[day]}
                    aria-pressed={input.weeklyDays.includes(day)}
                  >
                    {WEEKDAY_SHORT[day]}
                  </button>
                ))}
              </div>
            </div>
            </>
          )}
        </div>

        <div className="share-card">
          <div className="compact-label">
            <span>Sharing</span>
            <small>{input.shareLevel === 'private' ? 'Private by default' : input.shareLevel === 'friends' ? 'Friend feed' : 'Circle feed'}</small>
          </div>
          <div className="share-level-grid">
            <button
              className={input.shareLevel === 'private' ? 'active' : ''}
              type="button"
              onClick={() => setShareLevel('private')}
            >
              <Lock size={16} />
              <span>Private</span>
            </button>
            <button
              className={input.shareLevel === 'friends' ? 'active' : ''}
              type="button"
              onClick={() => setShareLevel('friends')}
            >
              <Users size={16} />
              <span>Friends</span>
            </button>
            <button
              className={input.shareLevel === 'circles' ? 'active' : ''}
              type="button"
              onClick={() => setShareLevel('circles')}
            >
              <Target size={16} />
              <span>Circles</span>
            </button>
          </div>
          <p className="helper-copy">
            Private habits can post aggregate check-ins. Shared habits show name, icon, and color.
          </p>
          {input.shareLevel === 'circles' && (
            <div className="circle-chip-list">
              {circles.length === 0 ? (
                <p className="helper-copy">Create or join a circle in Friends to share this habit there.</p>
              ) : (
                circles.map((circle) => (
                  <button
                    key={circle.id}
                    className={input.sharedCircleIds.includes(circle.id) ? 'circle-chip active' : 'circle-chip'}
                    type="button"
                    onClick={() => toggleSharedCircle(circle.id)}
                  >
                    <Target size={14} />
                    <span>{circle.name}</span>
                    {input.sharedCircleIds.includes(circle.id) && <Check size={14} />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="sheet-option-grid">
          <div className="option-card compact-option">
            <label className="switch-row">
              <span>
                <Bell size={18} />
                Reminder
              </span>
              <input
                type="checkbox"
                checked={input.reminderEnabled}
                onChange={(event) => setInput((current) => ({ ...current, reminderEnabled: event.target.checked }))}
              />
            </label>
            {input.reminderEnabled && (
              <label className="compact-field">
                <Clock3 size={16} />
                <input
                  type="time"
                  step="900"
                  value={input.reminderTime}
                  onChange={(event) => setInput((current) => ({ ...current, reminderTime: event.target.value }))}
                />
              </label>
            )}
          </div>

          <div className="option-card compact-option">
            <label className="switch-row">
              <span>
                <Timer size={18} />
                Timer
              </span>
              <input
                type="checkbox"
                checked={input.timerEnabled}
                onChange={(event) => setInput((current) => ({ ...current, timerEnabled: event.target.checked }))}
              />
            </label>
            {input.timerEnabled && (
              <label className="compact-field">
                <Clock3 size={16} />
                <input
                  type="number"
                  min="1"
                  max="180"
                  step="1"
                  value={input.timerMinutes}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      timerMinutes: Math.min(180, Math.max(1, Number(event.target.value) || 1)),
                    }))
                  }
                />
                <span>min</span>
              </label>
            )}
          </div>
        </div>

        <button className="primary-action" type="submit" disabled={!canSave || saving}>
          <Check size={20} />
          <span>{habit ? 'Save habit' : 'Add habit'}</span>
        </button>
      </form>
    </div>
  )
}

function HabitRow({
  habit,
  completed,
  onTrack,
  accessory,
  accessoryIcon: AccessoryIcon,
  onClick,
  onStartTimer,
}: {
  habit: Habit
  completed: boolean
  onTrack: boolean
  accessory: string
  accessoryIcon: LucideIcon
  onClick: () => void
  onStartTimer: () => void
}) {
  const rowClassName = ['habit-row', completed ? 'completed' : '', !completed && onTrack ? 'on-track' : ''].filter(Boolean).join(' ')

  return (
    <div className={rowClassName}>
      <button className="habit-main-button" type="button" onClick={onClick}>
        <HabitIdentity habit={habit} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div className="row-badges">
          <span className="row-meta">
            <AccessoryIcon size={15} />
            {accessory}
          </span>
          <HabitBadges habit={habit} showTimer={false} />
        </div>
        {habit.timerEnabled && (
          <button className="timer-pill" type="button" onClick={onStartTimer} aria-label={`Start ${habit.timerMinutes} minute timer for ${habit.name}`}>
            <Timer size={15} />
            {habit.timerMinutes}m
          </button>
        )}
      </div>
      <button className="check-control" type="button" onClick={onClick} aria-label={completed ? `Undo ${habit.name}` : `Complete ${habit.name}`}>
        {completed && <Check size={19} />}
      </button>
    </div>
  )
}

function HabitBadges({ habit, accessory, showTimer = true }: { habit: Habit; accessory?: string; showTimer?: boolean }) {
  const weekly = isWeeklyHabit(habit)
  if (!weekly && !habit.reminderEnabled && !(showTimer && habit.timerEnabled) && !accessory) {
    return null
  }

  return (
    <>
      {weekly && (
        <span className="row-meta">
          <CalendarDays size={15} />
          {getHabitCadenceLabel(habit)}
        </span>
      )}
      {habit.reminderEnabled && (
        <span className="row-meta">
          <Bell size={15} />
          {habit.reminderTime}
        </span>
      )}
      {showTimer && habit.timerEnabled && (
        <span className="row-meta">
          <Timer size={15} />
          {accessory ?? `${habit.timerMinutes}m`}
        </span>
      )}
    </>
  )
}

function TimerPanel({
  timer,
  isCompleted,
  onToggleRunning,
  onReset,
  onClose,
  onComplete,
}: {
  timer: ActiveTimer
  isCompleted: boolean
  onToggleRunning: () => void
  onReset: () => void
  onClose: () => void
  onComplete: () => Promise<void>
}) {
  const elapsed = timer.durationSeconds - timer.remainingSeconds
  const progress = timer.durationSeconds ? Math.round((elapsed / timer.durationSeconds) * 100) : 0
  const minutes = Math.floor(timer.remainingSeconds / 60)
  const seconds = timer.remainingSeconds % 60
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="timer-panel">
      <div className={`timer-orb ${timer.color}`} style={{ '--timer-progress': `${progress}%` } as CSSProperties}>
        <strong>{formattedTime}</strong>
        <span>{timer.habitName}</span>
      </div>
      <div className="timer-controls">
        <button className="icon-button quiet" type="button" onClick={onToggleRunning} aria-label={timer.isRunning ? 'Pause timer' : 'Resume timer'}>
          {timer.isRunning ? <Pause size={19} /> : <Play size={19} />}
        </button>
        <button className="icon-button quiet" type="button" onClick={onReset} aria-label="Restart timer">
          <RotateCcw size={19} />
        </button>
        <button className="secondary-action compact-action" type="button" onClick={onClose}>
          Close
        </button>
        <button className="primary-action compact-action" type="button" onClick={onComplete}>
          {isCompleted ? 'Done' : 'Complete'}
        </button>
      </div>
    </div>
  )
}

function HabitIdentity({ habit }: { habit: Habit }) {
  const Icon = habitIcons[habit.icon] ?? Sparkles

  return (
    <div className="habit-identity">
      <span className={`habit-glyph ${habit.color}`}>
        <Icon size={18} />
      </span>
      <strong>{habit.name}</strong>
    </div>
  )
}

function EmptyHabits({ onAddHabit }: { onAddHabit: () => void }) {
  return (
    <div className="empty-panel">
      <Sparkles size={24} />
      <h2>Start small</h2>
      <div className="empty-actions">
        <button className="primary-action" type="button" onClick={onAddHabit}>
          <Plus size={19} />
          <span>Add habit</span>
        </button>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function InlineMessage({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'warning' }) {
  return <p className={`inline-message ${tone}`}>{message}</p>
}

function LoadingPanel() {
  return (
    <div className="loading-panel">
      <span />
      <p>Warming up Bujo</p>
    </div>
  )
}

function SplashScreen() {
  return (
    <div className="splash-screen">
      <AppIconMark />
      <p>Bujo</p>
    </div>
  )
}

function ConfigScreen() {
  return (
    <div className="auth-screen">
      <AppIconMark />
      <h1>Connect Firebase</h1>
      <p>Add your Firebase values to `.env.local`, then restart the dev server.</p>
    </div>
  )
}

function AppIconMark() {
  return (
    <div className="app-mark">
      <img src="/bujo-icon.svg" alt="" aria-hidden="true" />
    </div>
  )
}

type FocusPriority = 'consistency' | 'mindfulness' | 'hydration' | 'circles'
type HabitsCount = '1-2' | '3-5' | '6-10' | '11+'

interface OnboardingAnswers {
  habitsCount?: HabitsCount
  focusPriority?: FocusPriority
}

const HABIT_COUNT_OPTIONS = [
  { id: '1-2' as HabitsCount, label: '1 - 2 Habits', sub: 'Focus on the essentials', icon: Sprout },
  { id: '3-5' as HabitsCount, label: '3 - 5 Habits', sub: 'Balanced daily growth', icon: Target },
  { id: '6-10' as HabitsCount, label: '6 - 10 Habits', sub: 'High performer routines', icon: Zap },
  { id: '11+' as HabitsCount, label: '11+ Habits', sub: 'Complete routine reset', icon: Crown },
]

const FOCUS_PRIORITY_OPTIONS = [
  { id: 'consistency' as FocusPriority, label: 'Consistency & Streaks', sub: 'Never break the chain', icon: Flame },
  { id: 'mindfulness' as FocusPriority, label: 'Mindful Reflections', sub: 'Mood and micro-journals', icon: Brain },
  { id: 'hydration' as FocusPriority, label: 'Clean Hydration & Habits', sub: 'Water and softdrink tracking', icon: Droplets },
  { id: 'circles' as FocusPriority, label: 'Social & Circles', sub: 'Accountability with friends', icon: Users },
]

function estimateYearlyChecks(habitsCount: HabitsCount | undefined): number {
  switch (habitsCount) {
    case '1-2':
      return 548 // ~1.5 habits * 365 days
    case '3-5':
      return 1460 // ~4 habits * 365 days
    case '6-10':
      return 2920 // ~8 habits * 365 days
    case '11+':
      return 4380 // ~12 habits * 365 days
    default:
      return 1000
  }
}

function useAnimatedNumber(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let rafId = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // cubic-bezier easeOut
      setValue(Math.round(target * eased))
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      }
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, durationMs])
  return value
}

function getReflectionDetails(focus: FocusPriority | undefined) {
  switch (focus) {
    case 'mindfulness':
      return {
        icon: Brain,
        title: 'Deep Mindful Reflection',
        desc: 'Log daily moods and notes to track mental wellness trends. Bujo lets you log short memories for each day, connecting your mental headspace directly with your habit success.',
        bulletTitle: 'HOW BUJO HELPS YOU REFLECT:',
        bullets: [
          'Log morning sleep quality & evening reviews',
          'Quick 1-40 character daily micro-journal highlights',
          'Interactive mood trend charts & streak rewards'
        ]
      }
    case 'hydration':
      return {
        icon: Droplets,
        title: 'Clean Body & Mind',
        desc: 'Hydration tracking with customizable target cups. Restrict sodas or coffee while maintaining clean habits to ensure you operate at peak levels.',
        bulletTitle: 'WHAT IS TRACKED AUTOMATICALLY:',
        bullets: [
          'Quick one-tap water cup logging',
          'Separate targets for soda/alcohol/coffee limits',
          'Earn water champion badges and health trophies'
        ]
      }
    case 'circles':
      return {
        icon: Users,
        title: 'Strength in Numbers',
        desc: 'Join accountability Circles to share progress. Send friendly cheers or nudges to keep your friends on track. Share a secure profile QR and build custom micro-communities.',
        bulletTitle: 'ACCELERATE YOUR SOCIAL MOTIVATION:',
        bullets: [
          'Share your unique QR code or friend link instantly',
          'Send nudges and interactive cheers to circles',
          'Set community goals with up to 100+ friends'
        ]
      }
    case 'consistency':
    default:
      return {
        icon: Flame,
        title: 'Bulletproof Consistency',
        desc: 'Visualise your chains. Check off habits to build solid streaks, earn premium trophies, and never break the chain. Bujo keeps your streaks alive even in the background.',
        bulletTitle: 'ACCELERATE YOUR CONSISTENCY:',
        bullets: [
          'Visual streak counter with flame indicators',
          'Background-persistent timers that never turn off',
          '100+ unlockable high-fidelity trophies'
        ]
      }
  }
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="onboarding-content-container animate-fade-up-stagger">
      <div className="onboarding-eyebrow">
        <Sparkles size={12} /> Introducing Bujo
      </div>
      <h1 className="onboarding-title">
        Small habits, <span className="gradient-text">beautifully</span> kept.
      </h1>
      <p className="onboarding-desc">
        Transform your daily routine into compound self-growth. Track habits, keep reflective journals, focus with timers, and share your path in private circles.
      </p>

      <div className="onboarding-feature-grid">
        <div className="onboarding-feature-card">
          <div className="onboarding-feature-icon-wrapper">
            <Target size={20} />
          </div>
          <h3 className="onboarding-feature-title">Mindful Tracking</h3>
          <p className="onboarding-feature-sub">Streaks & CADENCE</p>
        </div>
        <div className="onboarding-feature-card">
          <div className="onboarding-feature-icon-wrapper">
            <BookOpen size={20} />
          </div>
          <h3 className="onboarding-feature-title">Micro Journals</h3>
          <p className="onboarding-feature-sub">Daily Memories</p>
        </div>
        <div className="onboarding-feature-card">
          <div className="onboarding-feature-icon-wrapper">
            <Timer size={20} />
          </div>
          <h3 className="onboarding-feature-title">Focus Timers</h3>
          <p className="onboarding-feature-sub">Background Run</p>
        </div>
      </div>

      <button type="button" onClick={onNext} className="onboarding-btn-primary">
        Start Your Journey
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function HabitsCountStep({
  selected,
  onSelect,
}: {
  selected: HabitsCount | undefined
  onSelect: (val: HabitsCount) => void
}) {
  return (
    <div className="onboarding-content-container animate-fade-up-stagger">
      <h1 className="onboarding-title">How many habits do you want to track?</h1>
      <p className="onboarding-desc">
        A rough guess is perfect. We'll use this to estimate your self-improvement progress.
      </p>

      <div className="onboarding-chips-group">
        {HABIT_COUNT_OPTIONS.map((opt) => {
          const isSel = selected === opt.id
          const IconComp = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`onboarding-chip-btn ${isSel ? 'selected' : ''}`}
            >
              <div className="onboarding-chip-icon">
                <IconComp size={20} />
              </div>
              <div className="onboarding-chip-details">
                <span className="onboarding-chip-label">{opt.label}</span>
                <span className="onboarding-chip-sub">{opt.sub}</span>
              </div>
              <div className="onboarding-chip-check">
                <Check size={12} strokeWidth={3} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FocusPriorityStep({
  selected,
  onSelect,
}: {
  selected: FocusPriority | undefined
  onSelect: (val: FocusPriority) => void
}) {
  return (
    <div className="onboarding-content-container animate-fade-up-stagger">
      <h1 className="onboarding-title">What is your primary focus right now?</h1>
      <p className="onboarding-desc">
        Pick your highest priority. We will tailor Bujo's tools to help you succeed here.
      </p>

      <div className="onboarding-chips-group">
        {FOCUS_PRIORITY_OPTIONS.map((opt) => {
          const isSel = selected === opt.id
          const IconComp = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`onboarding-chip-btn ${isSel ? 'selected' : ''}`}
            >
              <div className="onboarding-chip-icon">
                <IconComp size={20} />
              </div>
              <div className="onboarding-chip-details">
                <span className="onboarding-chip-label">{opt.label}</span>
                <span className="onboarding-chip-sub">{opt.sub}</span>
              </div>
              <div className="onboarding-chip-check">
                <Check size={12} strokeWidth={3} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AhaMomentStep({
  habitsCount,
  onNext,
}: {
  habitsCount: HabitsCount | undefined
  onNext: () => void
}) {
  const yearlyTarget = estimateYearlyChecks(habitsCount)
  const animatedNumber = useAnimatedNumber(yearlyTarget, 1200)

  return (
    <div className="onboarding-content-container animate-fade-up-stagger">
      <div className="onboarding-eyebrow">
        <Sparkles size={12} /> Compounding Effect
      </div>
      <h1 className="onboarding-title">Your Projected Compound Growth</h1>
      <p className="onboarding-desc">
        Every check-in is a vote for the person you want to become. Here is your estimated check-in volume:
      </p>

      <div className="onboarding-stat-card">
        <span className="onboarding-stat-number">{animatedNumber.toLocaleString()}</span>
        <span className="onboarding-stat-label">Estimated check-ins in your first year</span>
        <span className="onboarding-stat-sub">Based on a consistent daily cadence</span>
      </div>

      <div className="onboarding-callout-card">
        <div className="onboarding-callout-icon">
          <Target size={18} />
        </div>
        <div className="onboarding-callout-text">
          <span className="onboarding-callout-headline">Simple actions, grand results.</span>
          <span className="onboarding-callout-desc">
            With regular reminder alerts and native timers, keeping streaks becomes automatic.
          </span>
        </div>
      </div>

      <button type="button" onClick={onNext} className="onboarding-btn-primary">
        See How Bujo Adapts
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function ReflectionStep({
  focusPriority,
  onNext,
}: {
  focusPriority: FocusPriority | undefined
  onNext: () => void
}) {
  const details = getReflectionDetails(focusPriority)
  const IconComp = details.icon

  return (
    <div className="onboarding-content-container animate-fade-up-stagger">
      <div className="onboarding-reflection-icon-hero">
        <IconComp size={36} />
      </div>
      <h1 className="onboarding-title">{details.title}</h1>
      <p className="onboarding-desc">{details.desc}</p>

      <div className="onboarding-reflection-feature-list">
        <h4 className="onboarding-reflection-list-title">{details.bulletTitle}</h4>
        {details.bullets.map((bullet, idx) => (
          <div key={idx} className="onboarding-reflection-item">
            <Check size={16} className="onboarding-reflection-check" strokeWidth={3} />
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      <button type="button" onClick={onNext} className="onboarding-btn-primary">
        Looks Perfect
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function GoogleSignInStep({
  error,
  onSignIn,
}: {
  error: string | null
  onSignIn: () => Promise<void>
}) {
  return (
    <div className="onboarding-content-container animate-fade-up-stagger">
      <AppIconMark />
      <div className="onboarding-eyebrow" style={{ marginTop: 16 }}>
        <Shield size={12} /> Secure Account Sync
      </div>
      <h1 className="onboarding-title">Create your private space.</h1>
      <p className="onboarding-desc">
        Sign in to enable automatic cloud backup, cross-device sync, circles, and persistent timers.
      </p>

      {error && <InlineMessage tone="warning" message={error} />}

      <button className="onboarding-btn-primary" type="button" onClick={onSignIn} style={{ height: 52 }}>
        <span aria-hidden="true" style={{
          display: 'grid',
          placeItems: 'center',
          width: '26px',
          aspectRatio: '1',
          borderRadius: '50%',
          color: '#fff',
          background: 'rgba(255, 255, 255, 0.25)',
          fontWeight: 800,
          marginRight: '6px'
        }}>G</span>
        Continue with Google
        <ChevronRight size={18} />
      </button>

      <div className="onboarding-security-row">
        <span className="onboarding-security-badge">
          <Check size={12} strokeWidth={3} /> Secure Firebase Sync
        </span>
        <span className="onboarding-security-badge">
          <Check size={12} strokeWidth={3} /> 100% Private
        </span>
      </div>
    </div>
  )
}

function SignInScreen({ error, onSignIn }: { error: string | null; onSignIn: () => Promise<void> }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>({})

  const onNext = () => setStep((s) => Math.min(5, s + 1))
  const onBack = () => setStep((s) => Math.max(0, s - 1))
  const onSkip = () => setStep(5)

  const selectHabitsCount = (val: HabitsCount) => {
    setAnswers((prev) => ({ ...prev, habitsCount: val }))
    setTimeout(onNext, 350)
  }

  const selectFocusPriority = (val: FocusPriority) => {
    setAnswers((prev) => ({ ...prev, focusPriority: val }))
    setTimeout(onNext, 350)
  }

  return (
    <div className="onboarding-wrapper">
      <div className="floating-orbs" aria-hidden="true">
        <div className="floating-orb floating-orb-1" />
        <div className="floating-orb floating-orb-2" />
        <div className="floating-orb floating-orb-3" />
      </div>

      <header className="onboarding-header">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0}
          className="onboarding-back-btn"
          aria-label="Previous step"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="onboarding-progress-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : i < step ? 'completed' : ''}`}
            />
          ))}
        </div>

        {step < 5 ? (
          <button type="button" onClick={onSkip} className="onboarding-skip-btn">
            Skip
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )}
      </header>

      <main className="onboarding-body">
        {step === 0 && <WelcomeStep onNext={onNext} />}
        {step === 1 && (
          <HabitsCountStep
            selected={answers.habitsCount}
            onSelect={selectHabitsCount}
          />
        )}
        {step === 2 && (
          <FocusPriorityStep
            selected={answers.focusPriority}
            onSelect={selectFocusPriority}
          />
        )}
        {step === 3 && (
          <AhaMomentStep
            habitsCount={answers.habitsCount}
            onNext={onNext}
          />
        )}
        {step === 4 && (
          <ReflectionStep
            focusPriority={answers.focusPriority}
            onNext={onNext}
          />
        )}
        {step === 5 && (
          <GoogleSignInStep
            error={error}
            onSignIn={onSignIn}
          />
        )}
      </main>
    </div>
  )
}

function tabTitle(tab: TabId) {
  if (tab === 'habits') return 'Your habits'
  if (tab === 'progress') return 'Progress'
  if (tab === 'friends') return 'Friends'
  return 'Settings'
}

function FriendsView({
  myProfile,
  friends,
  loading,
  activityEvents,
  circles,
  inboxItems,
  unreadCount,
  cheersSentToday,
  cheersReceivedToday,
  cheersSent,
  cheersReceived,
  onFollow,
  onUnfollow,
  onSendCheer,
  onSendNudge,
  onTogglePrivacy,
  onCreateCircle,
  onJoinCircle,
  onLeaveCircle,
  onMarkInboxItemRead,
}: {
  myProfile: FriendProfile | null
  friends: FriendProfile[]
  loading: boolean
  activityEvents: ActivityEvent[]
  circles: Circle[]
  inboxItems: SocialInboxItem[]
  unreadCount: number
  cheersSentToday: Set<string>
  cheersReceivedToday: number
  cheersSent: Cheer[]
  cheersReceived: Cheer[]
  onFollow: (code: string) => Promise<{ success: boolean; message: string }>
  onUnfollow: (uid: string) => Promise<void>
  onSendCheer: (uid: string, type?: CheerType) => Promise<void>
  onSendNudge: (uid: string, message?: string) => Promise<void>
  onTogglePrivacy: (isPublic: boolean) => Promise<void>
  onCreateCircle: (name: string, weeklyGoal: number) => Promise<{ success: boolean; message: string }>
  onJoinCircle: (code: string) => Promise<{ success: boolean; message: string }>
  onLeaveCircle: (circleId: string) => Promise<void>
  onMarkInboxItemRead: (itemId: string) => Promise<void>
}) {
  const [activeSocialView, setActiveSocialView] = useState<'feed' | 'friends' | 'circles'>('feed')
  const [friendCode, setFriendCode] = useState('')
  const [followMessage, setFollowMessage] = useState<string | null>(null)
  const [followError, setFollowError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [cheeringUid, setCheeringUid] = useState<string | null>(null)
  const [nudgingUid, setNudgingUid] = useState<string | null>(null)
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null)
  const [circleName, setCircleName] = useState('')
  const [circleGoal, setCircleGoal] = useState(70)
  const [circleCode, setCircleCode] = useState('')
  const [circleMessage, setCircleMessage] = useState<string | null>(null)
  const [circleError, setCircleError] = useState(false)
  const rankedFriends = useMemo(
    () =>
      [...friends].sort(
        (first, second) =>
          second.todayProgress - first.todayProgress ||
          second.streak - first.streak ||
          (second.cheersToday ?? 0) - (first.cheersToday ?? 0),
      ),
    [friends],
  )
  const champion = rankedFriends[0]
  const podium = rankedFriends.slice(0, 3)
  const totalCheersReceived = cheersReceived.length
  const profileIsPublic = myProfile?.isPublic !== false
  const friendCodeValue = myProfile?.friendCode
  const friendFeed = useMemo(() => {
    const items: Array<{
      id: string
      icon: LucideIcon
      title: string
      detail: string
      meta: string
      tone: 'fresh' | 'warm' | 'quiet' | 'celebrate'
      sort: number
      friendUid?: string
    }> = []

    cheersReceived.forEach((cheer) => {
      const cheerAction = getCheerAction(cheer.type)
      items.push({
        id: `received-${cheer.id}`,
        icon: cheerAction.icon,
        title: `${cheer.fromName} cheered you`,
        detail: `${cheerAction.label} cheer received`,
        meta: format(dateFromKey(cheer.date), 'MMM d'),
        tone: 'celebrate',
        sort: 130,
        friendUid: cheer.fromUid,
      })
    })

    cheersSent.forEach((cheer) => {
      const friend = rankedFriends.find((candidate) => candidate.uid === cheer.toUid)
      const cheerAction = getCheerAction(cheer.type)
      items.push({
        id: `sent-${cheer.id}`,
        icon: cheerAction.icon,
        title: `You cheered ${cheer.toName || friend?.displayName || 'a friend'}`,
        detail: `${cheerAction.label} sent`,
        meta: format(dateFromKey(cheer.date), 'MMM d'),
        tone: 'fresh',
        sort: 120,
      })
    })

    rankedFriends.forEach((friend) => {
      const activity = getActivityMeta(friend.lastActive)
      const progress = Math.max(0, Math.min(100, friend.todayProgress))

      if (progress >= 100) {
        items.push({
          id: `complete-${friend.uid}`,
          icon: Check,
          title: `${friend.displayName} finished today's habits`,
          detail: `${friend.streak}d streak is still alive`,
          meta: activity.label,
          tone: 'celebrate',
          sort: 110 + friend.streak / 100,
          friendUid: friend.uid,
        })
      } else if (progress > 0) {
        items.push({
          id: `progress-${friend.uid}`,
          icon: Activity,
          title: `${friend.displayName} checked in`,
          detail: `${progress}% complete today`,
          meta: activity.label,
          tone: 'fresh',
          sort: 90 + progress / 100,
          friendUid: friend.uid,
        })
      } else if (activity.daysAgo <= 1) {
        items.push({
          id: `active-${friend.uid}`,
          icon: Sparkles,
          title: `${friend.displayName} opened Bujo`,
          detail: 'Their day is warming up',
          meta: activity.label,
          tone: 'warm',
          sort: 70 - activity.daysAgo,
          friendUid: friend.uid,
        })
      }

      if (friend.streak >= 3) {
        items.push({
          id: `streak-${friend.uid}`,
          icon: Flame,
          title: `${friend.displayName} is on a ${friend.streak}d streak`,
          detail: `${friend.habitsCount} active ${friend.habitsCount === 1 ? 'habit' : 'habits'}`,
          meta: activity.label,
          tone: friend.streak >= 7 ? 'celebrate' : 'warm',
          sort: 60 + Math.min(friend.streak, 30) / 30,
          friendUid: friend.uid,
        })
      }
    })

    return items.sort((first, second) => second.sort - first.sort).slice(0, 8)
  }, [cheersReceived, cheersSent, rankedFriends])

  const handleCopyCode = useCallback(async () => {
    if (!friendCodeValue) return
    try {
      await navigator.clipboard.writeText(friendCodeValue)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }, [friendCodeValue])

  const handleFollow = async () => {
    if (!friendCode.trim()) return
    setSubmitting(true)
    setFollowMessage(null)
    try {
      const result = await onFollow(friendCode)
      setFollowMessage(result.message)
      setFollowError(!result.success)
      if (result.success) setFriendCode('')
    } catch {
      setFollowMessage('Something went wrong.')
      setFollowError(true)
    }
    setSubmitting(false)
    setTimeout(() => setFollowMessage(null), 4000)
  }

  const handleSendCheer = async (friend: FriendProfile, type: CheerType = 'spark') => {
    setCheeringUid(friend.uid)
    try {
      await onSendCheer(friend.uid, type)
    } finally {
      setCheeringUid(null)
    }
  }

  const handleSendNudge = async (friend: FriendProfile) => {
    setNudgingUid(friend.uid)
    try {
      await onSendNudge(friend.uid)
    } finally {
      setNudgingUid(null)
    }
  }

  const handleCreateCircle = async () => {
    if (!circleName.trim()) return
    setCircleMessage(null)
    const result = await onCreateCircle(circleName, circleGoal)
    setCircleMessage(result.message)
    setCircleError(!result.success)
    if (result.success) setCircleName('')
  }

  const handleJoinCircle = async () => {
    if (!circleCode.trim()) return
    setCircleMessage(null)
    const result = await onJoinCircle(circleCode)
    setCircleMessage(result.message)
    setCircleError(!result.success)
    if (result.success) setCircleCode('')
  }

  const handleShareCode = async () => {
    if (!friendCodeValue) return
    if (typeof navigator.share !== 'undefined') {
      try {
        await navigator.share({
          title: 'Follow me on Bujo Bloom!',
          text: `Add me on Bujo Bloom. My friend code: ${friendCodeValue}\nJoin me in building better habits!`,
          url: 'https://bujobloom.web.app',
        })
      } catch {
        handleCopyCode()
      }
    } else {
      handleCopyCode()
    }
  }

  return (
    <section className="screen-stack" aria-label="Friends">
      <div className="champion-card">
        <div className="champion-orb">
          {champion?.photoURL ? <img src={champion.photoURL} alt="" referrerPolicy="no-referrer" /> : <Crown size={28} />}
        </div>
        <div>
          <p className="panel-kicker">Champion today</p>
          <h2>{champion?.displayName ?? 'Invite a friend'}</h2>
          <p>
            {champion
              ? `${champion.todayProgress}% progress · ${champion.streak}d streak · ${champion.cheersToday ?? 0} cheers`
              : 'Friends make tiny routines feel a little more alive.'}
          </p>
        </div>
        <span className="champion-score">{champion?.todayProgress ?? 0}%</span>
      </div>

      <div className="friend-stats-grid">
        <div>
          <PartyPopper size={18} />
          <strong>{cheersSent.length}</strong>
          <span>Sent</span>
        </div>
        <div>
          <Crown size={18} />
          <strong>{cheersReceivedToday}</strong>
          <span>Received</span>
        </div>
        <div>
          <Users size={18} />
          <strong>{friends.length}</strong>
          <span>Following</span>
        </div>
      </div>

      <div className="social-segmented" role="tablist" aria-label="Social sections">
        {[
          { id: 'feed', label: 'Feed', count: activityEvents.length + unreadCount },
          { id: 'friends', label: 'Friends', count: friends.length },
          { id: 'circles', label: 'Circles', count: circles.length },
        ].map((item) => (
          <button
            key={item.id}
            className={activeSocialView === item.id ? 'active' : ''}
            type="button"
            onClick={() => setActiveSocialView(item.id as 'feed' | 'friends' | 'circles')}
          >
            <span>{item.label}</span>
            {item.count > 0 && <small>{item.count}</small>}
          </button>
        ))}
      </div>

      {activeSocialView === 'feed' && (
      <div className="panel-section social-feed-panel">
        <div className="section-heading">
          <h2>Feed</h2>
          <span>{activityEvents.length || friendFeed.length ? 'Live today' : 'Quiet for now'}</span>
        </div>
        {inboxItems.length > 0 && (
          <div className="inbox-list">
            {inboxItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.read ? 'inbox-item' : 'inbox-item unread'}
                onClick={() => onMarkInboxItemRead(item.id)}
              >
                <Inbox size={16} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.body}</small>
                </span>
                {!item.read && <i />}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <p className="helper-copy">Loading friend updates...</p>
        ) : activityEvents.length === 0 && friendFeed.length === 0 ? (
          <div className="feed-empty">
            <Activity size={22} />
            <p>Friend check-ins, streaks, and cheers will show up here.</p>
          </div>
        ) : activityEvents.length > 0 ? (
          <div className="friend-feed">
            {activityEvents.slice(0, 12).map((event) => {
              const Icon = event.type === 'cheer' ? PartyPopper : event.type === 'nudge' ? Send : event.type === 'milestone' ? Trophy : Activity
              const feedFriend = event.actorUid === myProfile?.uid ? undefined : friends.find((friend) => friend.uid === event.actorUid)
              const canCheer = Boolean(feedFriend && !cheersSentToday.has(feedFriend.uid) && cheeringUid !== feedFriend.uid)

              return (
                <div className={`friend-feed-item ${event.type === 'milestone' ? 'celebrate' : 'fresh'}`} key={event.id}>
                  <span className={`feed-icon ${event.habitColor ?? ''}`}>
                    {event.habitIcon ? (() => {
                      const HabitIcon = habitIcons[event.habitIcon] ?? Activity
                      return <HabitIcon size={16} />
                    })() : (
                      <Icon size={16} />
                    )}
                  </span>
                  <div className="feed-content">
                    <strong>{event.summary}</strong>
                    <small>{event.circleName ? `${event.circleName} · ${event.detail ?? ''}` : event.detail ?? 'Small progress'}</small>
                  </div>
                  <div className="feed-side">
                    <span>{format(dateFromKey(event.date), 'MMM d')}</span>
                    {feedFriend && (
                      <button
                        type="button"
                        className="feed-cheer-button"
                        disabled={!canCheer}
                        onClick={() => handleSendCheer(feedFriend)}
                        aria-label={`Cheer ${feedFriend.displayName}`}
                      >
                        {cheersSentToday.has(feedFriend.uid) ? <Check size={14} /> : <PartyPopper size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="friend-feed">
            {friendFeed.map((item) => {
              const Icon = item.icon
              const feedFriend = item.friendUid ? rankedFriends.find((friend) => friend.uid === item.friendUid) : undefined
              const canCheer = Boolean(feedFriend && !cheersSentToday.has(feedFriend.uid) && cheeringUid !== feedFriend.uid)

              return (
                <div className={`friend-feed-item ${item.tone}`} key={item.id}>
                  <span className="feed-icon">
                    <Icon size={16} />
                  </span>
                  <div className="feed-content">
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <div className="feed-side">
                    <span>{item.meta}</span>
                    {feedFriend && (
                      <button
                        type="button"
                        className="feed-cheer-button"
                        disabled={!canCheer}
                        onClick={() => handleSendCheer(feedFriend)}
                        aria-label={`Cheer ${feedFriend.displayName}`}
                      >
                        {cheersSentToday.has(feedFriend.uid) ? <Check size={14} /> : <PartyPopper size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {activeSocialView === 'friends' && (
      <>
      <div className="friend-code-card">
        <div className="friend-code-header">
          <div>
            <p className="panel-kicker">Your friend code</p>
            <h2 className="friend-code-value">{friendCodeValue ?? '...'}</h2>
          </div>
          <div className="friend-code-actions">
            <button
              className={profileIsPublic ? 'icon-button' : 'icon-button quiet'}
              type="button"
              onClick={() => onTogglePrivacy(!profileIsPublic)}
              aria-label={profileIsPublic ? 'Make profile private' : 'Make profile public'}
            >
              {profileIsPublic ? <Unlock size={20} /> : <Lock size={20} />}
            </button>
            <button className="icon-button" type="button" onClick={handleCopyCode} aria-label="Copy code">
              {codeCopied ? <Check size={20} /> : <Copy size={20} />}
            </button>
            <button className="icon-button" type="button" onClick={handleShareCode} aria-label="Share code">
              <Share size={20} />
            </button>
          </div>
        </div>
        <p className="helper-copy">
          Share this code with friends. Your profile is {profileIsPublic ? 'public to signed-in Bujo friends' : 'private'}.
        </p>
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Add a friend</h2>
        </div>
        <div className="add-friend-form">
          <div className="friend-input-row">
            <input
              type="text"
              placeholder="Enter friend code"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="friend-code-input"
            />
            <button
              className="primary-action follow-btn"
              type="button"
              onClick={handleFollow}
              disabled={submitting || !friendCode.trim()}
            >
              <UserPlus size={18} />
              <span>{submitting ? '...' : 'Follow'}</span>
            </button>
          </div>
          {followMessage && (
            <p className={`follow-feedback ${followError ? 'error' : 'success'}`}>{followMessage}</p>
          )}
        </div>
      </div>

      {podium.length > 0 && (
        <div className="podium-card">
          {podium.map((friend, index) => {
            const Icon = index === 0 ? Crown : Medal
            return (
              <div className={`podium-place rank-${index + 1}`} key={friend.uid}>
                <Icon size={18} />
                <strong>{friend.displayName}</strong>
                <span>{friend.todayProgress}%</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="panel-section">
        <div className="section-heading">
          <h2>Leaderboard</h2>
          <span>{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</span>
        </div>

        {loading ? (
          <p className="helper-copy">Loading friends...</p>
        ) : friends.length === 0 ? (
          <div className="empty-friends">
            <Users size={40} className="empty-friends-icon" />
            <p>No friends yet</p>
            <span>Share your friend code or add someone using theirs!</span>
          </div>
        ) : (
          <div className="leaderboard-list">
            {rankedFriends.map((friend, index) => {
              const cheered = cheersSentToday.has(friend.uid)
              const activity = getActivityMeta(friend.lastActive)
              const CheerIcon = cheered ? Check : PartyPopper

              return (
                <div className="leaderboard-row" key={friend.uid}>
                  <span className="leader-rank">{index + 1}</span>
                  <div className="friend-avatar">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={22} />
                    )}
                  </div>
                  <div className="friend-info">
                    <div className="friend-title-line">
                      <strong>{friend.displayName}</strong>
                      <span className={`activity-status ${activity.tone}`}>{activity.label}</span>
                    </div>
                    <div className="friend-progress-bar" aria-label={`${friend.displayName} progress ${friend.todayProgress}%`}>
                      <span style={{ width: `${friend.todayProgress}%` }} />
                    </div>
                    <div className="friend-stats">
                      <span><Flame size={13} /> {friend.streak}d</span>
                      <span><Target size={13} /> {friend.todayProgress}%</span>
                      <span><PartyPopper size={13} /> {friend.cheersToday ?? 0}</span>
                    </div>
                    <div className="activity-dots" aria-hidden="true">
                      {Array.from({ length: 7 }, (_, dotIndex) => (
                        <span className={dotIndex < Math.max(1, Math.round((friend.todayProgress / 100) * 7)) ? 'active' : ''} key={dotIndex} />
                      ))}
                    </div>
                    <div className="cheer-row">
                      {cheerActions.map(({ type, label, icon: Icon }) => (
                        <button
                          type="button"
                          key={type}
                          disabled={cheered || cheeringUid === friend.uid}
                          onClick={() => handleSendCheer(friend, type)}
                        >
                          <Icon size={14} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="icon-button quiet unfollow-btn"
                      type="button"
                      onClick={() => setSelectedFriend(friend)}
                      aria-label={`Open ${friend.displayName} profile`}
                    >
                      <Users size={18} />
                    </button>
                    <button
                      className={cheered ? 'cheer-main sent' : 'cheer-main'}
                      type="button"
                      disabled={cheered || cheeringUid === friend.uid}
                      onClick={() => handleSendCheer(friend)}
                      aria-label={`Cheer ${friend.displayName}`}
                    >
                      <CheerIcon size={18} />
                    </button>
                    <button
                      className="icon-button quiet unfollow-btn"
                      type="button"
                      disabled={nudgingUid === friend.uid}
                      onClick={() => handleSendNudge(friend)}
                      aria-label={`Nudge ${friend.displayName}`}
                    >
                      <Send size={18} />
                    </button>
                    <button
                      className="icon-button quiet unfollow-btn"
                      type="button"
                      onClick={() => onUnfollow(friend.uid)}
                      aria-label={`Unfollow ${friend.displayName}`}
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Cheers</h2>
          <span>{totalCheersReceived} today</span>
        </div>
        {cheersReceived.length === 0 ? (
          <div className="cheer-empty">
            <PartyPopper size={24} />
            <p>Send a few cheers first. Good energy tends to echo.</p>
          </div>
        ) : (
          <div className="cheer-feed">
            {cheersReceived.map((cheer) => {
              const cheerAction = cheerActions.find((action) => action.type === cheer.type) ?? cheerActions[0]
              const Icon = cheerAction.icon
              return (
                <div className="cheer-item" key={cheer.id}>
                  <span>
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{cheer.fromName}</strong>
                    <small>{cheerAction.label} cheer · {format(dateFromKey(cheer.date), 'MMM d')}</small>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel-section compact-social-note">
        <QrCode size={20} />
        <p className="helper-copy">Cheering is limited to once per friend each day so it stays meaningful.</p>
      </div>
      </>
      )}

      {activeSocialView === 'circles' && (
        <div className="social-view-stack">
          <div className="panel-section">
            <div className="section-heading">
              <h2>Create circle</h2>
              <span>Small group</span>
            </div>
            <div className="circle-form">
              <input
                type="text"
                value={circleName}
                onChange={(event) => setCircleName(event.target.value)}
                placeholder="Weekend reset"
                maxLength={26}
              />
              <label>
                <span>Weekly goal</span>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  value={circleGoal}
                  onChange={(event) => setCircleGoal(Math.max(10, Math.min(100, Number(event.target.value) || 70)))}
                />
              </label>
              <button className="primary-action compact-action" type="button" onClick={handleCreateCircle}>
                <Plus size={18} />
                Create
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <h2>Join circle</h2>
              <span>Invite code</span>
            </div>
            <div className="friend-input-row">
              <input
                type="text"
                placeholder="Circle code"
                value={circleCode}
                onChange={(event) => setCircleCode(event.target.value.toUpperCase())}
                className="friend-code-input"
                maxLength={10}
              />
              <button className="primary-action follow-btn" type="button" onClick={handleJoinCircle} disabled={!circleCode.trim()}>
                <UserPlus size={18} />
                Join
              </button>
            </div>
            {circleMessage && <p className={`follow-feedback ${circleError ? 'error' : 'success'}`}>{circleMessage}</p>}
          </div>

          <div className="circle-list">
            {circles.length === 0 ? (
              <div className="empty-friends">
                <Target size={40} className="empty-friends-icon" />
                <p>No circles yet</p>
                <span>Create a small weekly accountability group or join one by code.</span>
              </div>
            ) : (
              circles.map((circle) => {
                const momentum = getCircleMomentum(circle)
                return (
                  <div className="circle-card" key={circle.id}>
                    <div className="circle-card-head">
                      <div>
                        <p className="panel-kicker">Invite {circle.inviteCode}</p>
                        <h2>{circle.name}</h2>
                      </div>
                      <span>{momentum}%</span>
                    </div>
                    <div className="friend-progress-bar" aria-label={`${circle.name} momentum ${momentum}%`}>
                      <span style={{ width: `${momentum}%` }} />
                    </div>
                    <p className="helper-copy">Weekly goal {circle.weeklyGoal}% · {circle.members.length} members</p>
                    <div className="circle-member-list">
                      {circle.members.map((member) => (
                        <div className="circle-member-row" key={member.uid}>
                          <div className="friend-avatar">
                            {member.photoURL ? <img src={member.photoURL} alt="" referrerPolicy="no-referrer" /> : <Users size={18} />}
                          </div>
                          <span>
                            <strong>{member.displayName}</strong>
                            <small>{member.role === 'owner' ? 'Owner' : `${member.todayProgress}% today`}</small>
                          </span>
                          <b>{member.weeklyProgress}%</b>
                        </div>
                      ))}
                    </div>
                    <div className="circle-actions">
                      <button className="secondary-action compact-action" type="button" onClick={() => navigator.clipboard?.writeText(circle.inviteCode)}>
                        <Copy size={16} />
                        Copy code
                      </button>
                      <button className="secondary-action compact-action danger" type="button" onClick={() => onLeaveCircle(circle.id)}>
                        Leave
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {selectedFriend && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedFriend(null)}>
          <div className="sheet friend-profile-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>{selectedFriend.displayName}</h2>
              <button className="icon-button quiet" type="button" aria-label="Close" onClick={() => setSelectedFriend(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-row">
              {selectedFriend.photoURL ? <img src={selectedFriend.photoURL} alt="" referrerPolicy="no-referrer" /> : <div className="avatar-fallback">{selectedFriend.displayName.charAt(0)}</div>}
              <div>
                <strong>{selectedFriend.streak}d streak</strong>
                <span>{selectedFriend.weeklyProgress}% week · {selectedFriend.sharedHabitCount} shared habits</span>
              </div>
            </div>
            <div className="coach-grid">
              <div className="coach-card">
                <span>Today</span>
                <strong>{selectedFriend.todayProgress}%</strong>
                <p>{getActivityMeta(selectedFriend.lastActive).label}</p>
              </div>
              <div className="coach-card">
                <span>Cheers</span>
                <strong>{selectedFriend.cheersToday ?? 0}</strong>
                <p>today</p>
              </div>
              <div className="coach-card">
                <span>Milestone</span>
                <strong>{selectedFriend.lastMilestone ?? '—'}</strong>
                <p>{selectedFriend.habitsCount} habits</p>
              </div>
            </div>
            <div className="friend-sheet-actions">
              <button className="primary-action" type="button" onClick={() => handleSendCheer(selectedFriend)}>
                <PartyPopper size={18} />
                Cheer
              </button>
              <button className="secondary-action" type="button" onClick={() => handleSendNudge(selectedFriend)}>
                <Send size={18} />
                Nudge
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function AchievementCardModal({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  const [showShareCard, setShowShareCard] = useState(false)
  const Icon = achievementIcons[achievement.icon]

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bujo Bloom - Achievement Unlocked!`,
          text: achievement.sharingText,
          url: 'https://bujobloom.web.app',
        })
      } catch (err) {
        console.error(err)
        setShowShareCard(true)
      }
    } else {
      setShowShareCard(true)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="sheet collectible-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header" style={{ justifyContent: 'flex-end', paddingBottom: '0' }}>
          <button className="icon-button quiet" type="button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="collectible-card-container">
          <div className={`collectible-card ${achievement.unlocked ? 'unlocked' : 'locked'}`} style={{ '--card-gradient': achievement.color } as CSSVariableProperties}>
            <div className="collectible-card-glow" />
            <div className="collectible-badge-container" style={{ background: achievement.unlocked ? 'var(--bg)' : 'rgba(255,255,255,0.06)' }}>
              <Icon size={42} className="collectible-badge-icon" />
            </div>
            <h3>{achievement.title}</h3>
            <p className="collectible-desc">{achievement.description}</p>
            <span className="collectible-status">
              {achievement.unlocked ? '✨ COLLECTED ✨' : '🔒 LOCKED'}
            </span>
          </div>

          <div className="collectible-actions">
            {achievement.unlocked ? (
              <button className="primary-action share-btn" type="button" onClick={handleShareClick}>
                <Share size={18} />
                <span>Share Achievement</span>
              </button>
            ) : (
              <p className="helper-copy" style={{ textAlign: 'center', marginTop: '12px' }}>
                Keep building your routines to collect this badge!
              </p>
            )}
          </div>
        </div>
      </div>

      {showShareCard && (
        <InstagramShareModal
          achievement={achievement}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  )
}

function InstagramShareModal({
  achievement,
  onClose,
}: {
  achievement?: Achievement
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const todayDate = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const shareText = achievement 
    ? achievement.sharingText 
    : `🌱 Checked in on Bujo Bloom today! Building positive habits one day at a time. Join me! 🚀`

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bujo Bloom Growth Card',
          text: shareText,
          url: 'https://bujobloom.web.app',
        })
      } catch (err) {
        console.error(err)
      }
    }
  }

  const quotes = [
    "Tiny daily actions lead to big, beautiful blooms.",
    "Consistency is the soil where change takes root.",
    "Your habits define your growth. Keep blooming.",
    "One routine at a time, you are transforming.",
    "Bloom where you are planted, and grow every day.",
  ]
  const quote = quotes[Math.abs(new Date().getDate() % quotes.length)]

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="instagram-share-card-container" onClick={(e) => e.stopPropagation()}>
        <div className="share-actions-header">
          <h3>Share Progress</h3>
          <button className="icon-button quiet close-share-btn" type="button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="instagram-card-wrapper">
          <div className="instagram-card">
            <div className="card-mesh" />
            <div className="card-glass">
              <div className="card-header">
                <div className="brand-badge">
                  <Leaf size={16} />
                  <span>Bujo Bloom</span>
                </div>
                <span className="card-date">{todayDate}</span>
              </div>

              <div className="card-body">
                {achievement ? (() => {
                  const AchievementIcon = achievementIcons[achievement.icon]
                  return (
                    <div className="card-achievement-hero">
                      <div className="card-badge-glow" style={{ background: achievement.color }} />
                      <div className="card-badge-circle animate-pop" style={{ background: achievement.color }}>
                        <AchievementIcon size={36} />
                      </div>
                      <h4>Achievement Unlocked</h4>
                      <h2>{achievement.title}</h2>
                      <p className="achievement-desc">"{achievement.description}"</p>
                    </div>
                  )
                })() : (
                  <div className="card-general-hero">
                    <div className="ring-aesthetic animate-pop">
                      <Leaf size={38} className="pulsing-leaf" />
                    </div>
                    <h4>Daily Progress</h4>
                    <h2>Keep Growing</h2>
                    <p className="card-quote">"{quote}"</p>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <p className="bujo-stamp">🌱 BUJOBLOOM.WEB.APP</p>
              </div>
            </div>
          </div>
        </div>

        <p className="screenshot-tip">📸 Take a screenshot to share directly to Instagram Stories!</p>

        <div className="share-action-buttons">
          {typeof navigator.share !== 'undefined' && (
            <button className="primary-action share-pill" type="button" onClick={handleNativeShare}>
              <Share size={18} />
              <span>Native Share</span>
            </button>
          )}
          <button className="secondary-action copy-pill" type="button" onClick={handleCopyText}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Copied!' : 'Copy Emoji Text'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
