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
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useBujoData } from './hooks/useBujoData'
import { useFriends } from './hooks/useFriends'
import { dateFromKey, getDateKey, getRecentDateKeys, getWeekDateKeys } from './lib/dates'
import { getHabitCadenceLabel, getHabitGoalProgress, getWindowGoalStats, isWeeklyHabit, normalizeWeeklyTarget, WEEKDAY_SHORT } from './lib/habitGoals'
import { calculateStreaks } from './lib/habitStats'
import { requestPushToken } from './lib/notifications'
import { getUserTimeZone } from './lib/reminders'
import type { Achievement, Cheer, CheerType, DrinkCheckin, FriendProfile, Habit, HabitColor, HabitIcon, MoodCheckin, MoodValue, NewHabitInput, NotificationPrefs, TimeOfDay, WeekDay } from './types'

type TabId = 'today' | 'habits' | 'progress' | 'friends' | 'settings'
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
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

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
  }
}

interface ActiveTimer {
  habitId: string
  habitName: string
  color: HabitColor
  durationSeconds: number
  remainingSeconds: number
  isRunning: boolean
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
  const bujo = useBujoData(authState.user)
  const social = useFriends(authState.user)
  const { syncMyProfile } = social
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
  const greetingName = authState.user?.displayName?.split(' ')[0] ?? 'there'

  // Sync public profile for friends feature
  useEffect(() => {
    if (!bujo.loading && bujo.activeHabits.length > 0) {
      syncMyProfile(currentStreak, bujo.activeHabits.length, progress)
    }
  }, [currentStreak, bujo.activeHabits.length, progress, bujo.loading, syncMyProfile])

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
                onToggle={bujo.toggleToday}
                onSetMood={bujo.setMood}
                onUpdateDrink={bujo.updateDrinkCount}
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
                streaks={appStreaks}
              />
            )}
            {activeTab === 'friends' && (
              <FriendsView
                myProfile={social.myProfile}
                friends={social.friends}
                loading={social.loading}
                cheersSentToday={social.cheersSentToday}
                cheersReceivedToday={social.cheersReceivedToday}
                cheersSent={social.cheersSent}
                cheersReceived={social.cheersReceived}
                onFollow={social.followByCode}
                onUnfollow={social.unfollow}
                onSendCheer={social.sendCheer}
                onTogglePrivacy={social.togglePrivacy}
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
          onClose={() => {
            setIsSheetOpen(false)
            setEditingHabit(null)
          }}
          onSave={handleHabitSave}
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
  onToggle: (habitId: string, completed: boolean) => Promise<void>
  onSetMood: (timeOfDay: TimeOfDay, value: MoodValue | null) => Promise<void>
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol' | 'wine' | 'softdrink', delta: number) => Promise<void>
}) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [showTodayShare, setShowTodayShare] = useState(false)
  const completedCount = completedToday.size
  const progressPercent = Math.round(progress * 100)
  const weekKeys = useMemo(() => getWeekDateKeys(), [])

  useEffect(() => {
    if (!activeTimer?.isRunning) return

    const timerId = window.setInterval(() => {
      setActiveTimer((current) => {
        if (!current?.isRunning) return current

        if (current.remainingSeconds <= 1) {
          navigator.vibrate?.([12, 30, 12])
          return { ...current, remainingSeconds: 0, isRunning: false }
        }

        return { ...current, remainingSeconds: current.remainingSeconds - 1 }
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [activeTimer?.isRunning])

  const startTimer = (habit: Habit) => {
    const durationSeconds = Math.max(1, habit.timerMinutes) * 60
    setActiveTimer({
      habitId: habit.id,
      habitName: habit.name,
      color: habit.color,
      durationSeconds,
      remainingSeconds: durationSeconds,
      isRunning: true,
    })
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

      {activeTimer && (
        <TimerPanel
          timer={activeTimer}
          isCompleted={completedToday.has(activeTimer.habitId)}
          onToggleRunning={() => setActiveTimer((current) => (current ? { ...current, isRunning: !current.isRunning } : current))}
          onReset={() =>
            setActiveTimer((current) =>
              current
                ? {
                    ...current,
                    remainingSeconds: current.durationSeconds,
                    isRunning: true,
                  }
                : current,
            )
          }
          onClose={() => setActiveTimer(null)}
          onComplete={async () => {
            const completed = completedToday.has(activeTimer.habitId)
            if (!completed) {
              await onToggle(activeTimer.habitId, false)
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
                  await onToggle(habit.id, completed)
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
  onClose,
}: {
  dateKey: string
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  onClose: () => void
}) {
  const todaysMoods = moods.filter((m) => m.date === dateKey)
  const morningMood = todaysMoods.find((m) => m.timeOfDay === 'morning')?.value
  const eveningMood = todaysMoods.find((m) => m.timeOfDay === 'evening')?.value

  const completedIds = new Set(checkins.filter((c) => c.date === dateKey).map((c) => c.habitId))
  const completed = activeHabits.filter((h) => completedIds.has(h.id))
  const pending = activeHabits.filter((h) => !completedIds.has(h.id))

  const moodOptions: Record<MoodValue, { icon: React.ReactNode; label: string }> = {
    terrible: { icon: <CloudRain size={16} />, label: 'Terrible' },
    bad: { icon: <Frown size={16} />, label: 'Bad' },
    okay: { icon: <Meh size={16} />, label: 'Okay' },
    good: { icon: <Smile size={16} />, label: 'Good' },
    great: { icon: <Laugh size={16} />, label: 'Great' },
  }

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
        <div className="sheet-content">
          <div className="panel-section">
            <div className="section-heading">
              <h2>Mood</h2>
            </div>
            <div className="mood-tracker" style={{ gap: '12px' }}>
              <div className="mood-row">
                <span>Sleep Quality</span>
                {morningMood ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)' }}>
                    {moodOptions[morningMood].icon} <strong>{moodOptions[morningMood].label}</strong>
                  </div>
                ) : (
                  <span>No check-in</span>
                )}
              </div>
              <div className="mood-row">
                <span>Day Feeling</span>
                {eveningMood ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)' }}>
                    {moodOptions[eveningMood].icon} <strong>{moodOptions[eveningMood].label}</strong>
                  </div>
                ) : (
                  <span>No check-in</span>
                )}
              </div>
            </div>
          </div>
          <div className="panel-section">
            <div className="section-heading">
              <h2>Habits</h2>
              <span>{completed.length}/{activeHabits.length}</span>
            </div>
            <div className="habit-list">
              {completed.map((h) => (
                <div key={h.id} className="habit-row" style={{ minHeight: 'auto', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--blue)' }}><Check size={16} /></div>
                    <strong>{h.name}</strong>
                  </div>
                </div>
              ))}
              {pending.map((h) => (
                <div key={h.id} className="habit-row" style={{ minHeight: 'auto', padding: '10px 14px', opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid var(--muted)' }} />
                    <span>{h.name}</span>
                  </div>
                </div>
              ))}
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
  doneIdsForDate,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
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
          onClose={() => setSelectedDate(null)}
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
}

function computeAchievements(
  habits: Habit[],
  checkins: Array<{ habitId: string; date: string }>,
  moods: MoodCheckin[],
  drinks: DrinkCheckin[],
  streak: number
): Achievement[] {
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

  return [
    {
      id: 'first-bloom',
      title: 'First Bloom',
      description: 'Completed your first ever daily tiny routine to start your growth journey.',
      icon: 'Sprout',
      color: 'linear-gradient(135deg, #2ecc71, #27ae60)',
      unlocked: hasFirstBloom,
      progressText: hasFirstBloom ? 'Unlocked' : '0/1 step',
      sharingText: '🌱 I just unlocked the "First Bloom" achievement on Bujo Bloom! My personal growth journey has officially begun! 🚀',
    },
    {
      id: 'streak-blaze',
      title: 'Streak Blaze',
      description: 'Maintained a consistent habit completion streak for 7 consecutive days.',
      icon: 'Flame',
      color: 'linear-gradient(135deg, #e67e22, #e74c3c)',
      unlocked: hasStreakBlaze,
      progressText: hasStreakBlaze ? 'Unlocked' : `${streak}/7 days`,
      sharingText: `🔥 Streak Blaze Unlocked! I've kept up a 7-day habit streak on Bujo Bloom. Consistency is power! 💪`,
    },
    {
      id: 'hydration-hero',
      title: 'Hydration Hero',
      description: 'Logged 5 or more cups of water in a single day to stay clean and hydrated.',
      icon: 'GlassWater',
      color: 'linear-gradient(135deg, #3498db, #2980b9)',
      unlocked: hasHydrationHero,
      progressText: hasHydrationHero ? 'Unlocked' : `${maxWater}/5 cups`,
      sharingText: '💧 Hydration Hero Unlocked! Successfully stayed perfectly hydrated with 5+ cups of water logged on Bujo Bloom today! 🥤',
    },
    {
      id: 'zen-master',
      title: 'Zen Master',
      description: 'Completed at least one focused meditation or work session using the habit timer.',
      icon: 'Timer',
      color: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
      unlocked: hasZenMaster,
      progressText: hasZenMaster ? 'Unlocked' : '0/1 session',
      sharingText: '🧘‍♂️ Zen Master Unlocked! Just completed a deep focus habit session with the Bujo Bloom focus timer! Mindful and productive. ⚡',
    },
    {
      id: 'self-reflective',
      title: 'Self-Reflective',
      description: 'Recorded at least 3 evening mood check-ins to review and reflect on your days.',
      icon: 'Moon',
      color: 'linear-gradient(135deg, #4f68ff, #3d3b76)',
      unlocked: hasSelfReflective,
      progressText: hasSelfReflective ? 'Unlocked' : `${eveningMoodsCount}/3 reviews`,
      sharingText: '🌙 Self-Reflective Unlocked! I\'ve logged 3 evening reviews on Bujo Bloom to reflect on my daily moods and thoughts. 💭',
    },
    {
      id: 'all-rounder',
      title: 'All-Rounder',
      description: 'Achieved complete success by logging 3 or more completed habits in a single day.',
      icon: 'Trophy',
      color: 'linear-gradient(135deg, #f1c40f, #d69d16)',
      unlocked: hasAllRounder,
      progressText: hasAllRounder ? 'Unlocked' : `${maxDailyCheckins}/3 habits`,
      sharingText: `🏆 All-Rounder Unlocked! Crushed it today by completing 3+ habits in a single day on Bujo Bloom! Hitting high gear! 🌟`,
    },
  ]
}

function ProgressView({
  activeHabits,
  checkins,
  moods,
  drinks,
  streaks,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  drinks: DrinkCheckin[]
  streaks: { current: number; best: number; total: number }
}) {
  const currentStreak = streaks.current
  const achievements = useMemo(() => {
    return computeAchievements(activeHabits, checkins, moods, drinks, currentStreak)
  }, [activeHabits, checkins, moods, drinks, currentStreak])

  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  const weekKeys = getWeekDateKeys()
  const recentKeys = getRecentDateKeys(14)
  const rhythmKeys = getRecentDateKeys(28)
  const currentSevenKeys = recentKeys.slice(7)
  const previousSevenKeys = recentKeys.slice(0, 7)
  const dateLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const activeHabitIds = new Set(activeHabits.map((habit) => habit.id))
  const activeCheckins = checkins.filter((checkin) => activeHabitIds.has(checkin.habitId))
  const doneIdsForDate = (dateKey: string) => new Set(activeCheckins.filter((checkin) => checkin.date === dateKey).map((checkin) => checkin.habitId))
  const dayRate = (dateKey: string) => {
    if (!activeHabits.length) return 0
    return Math.round((doneIdsForDate(dateKey).size / activeHabits.length) * 100)
  }
  const currentStats = getWindowGoalStats(activeHabits, activeCheckins, currentSevenKeys)
  const previousStats = getWindowGoalStats(activeHabits, activeCheckins, previousSevenKeys)
  const currentRate = currentStats.rate
  const previousRate = previousStats.rate
  const trend = currentRate - previousRate
  const lastThreeKeys = recentKeys.slice(-3)
  const lastThreeRate = getWindowGoalStats(activeHabits, activeCheckins, lastThreeKeys).rate
  const perfectDays = currentSevenKeys.filter((dateKey) => {
    const doneThatDay = doneIdsForDate(dateKey)
    return activeHabits.length > 0 && activeHabits.every((habit) => doneThatDay.has(habit.id))
  }).length

  const bestDay = recentKeys
    .map((dateKey) => ({ dateKey, rate: dayRate(dateKey) }))
    .sort((a, b) => b.rate - a.rate)[0]

  const weekdayStats = [0, 1, 2, 3, 4, 5, 6].map((index) => {
    const label = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]
    const matchingDays = rhythmKeys.filter((dateKey) => {
      const date = new Date(dateKey)
      const day = date.getDay()
      const mondayFirstIndex = day === 0 ? 6 : day - 1

      return mondayFirstIndex === index
    })
    const rate = getWindowGoalStats(activeHabits, activeCheckins, matchingDays).rate

    return { label, rate }
  })
  const bestWeekday = [...weekdayStats].sort((a, b) => b.rate - a.rate)[0]
  const habitBreakdown = activeHabits
    .map((habit) => {
      const habitDates = activeCheckins.filter((checkin) => checkin.habitId === habit.id).map((checkin) => checkin.date)
      const recentDone = recentKeys.filter((dateKey) => habitDates.includes(dateKey)).length
      const habitStats = getWindowGoalStats([habit], activeCheckins, recentKeys)
      const rate = habitStats.rate
      const habitStreak = calculateStreaks(habitDates).current

      return { habit, recentDone, rate, habitStreak, targetTotal: habitStats.possible }
    })
    .sort((a, b) => b.rate - a.rate)
  const strongestHabit = habitBreakdown[0]
  const focusHabit = [...habitBreakdown].reverse().find((item) => item.rate < 80) ?? habitBreakdown[habitBreakdown.length - 1]
  const dashboardMood =
    currentRate >= 80 ? 'In flow' : currentRate >= 50 ? 'Building' : activeHabits.length ? 'Warming up' : 'Empty'

  return (
    <section className="screen-stack" aria-label="Progress">
      <div className="insight-hero">
        <div>
          <p className="panel-kicker">{dashboardMood}</p>
          <h2>{currentRate}%</h2>
        </div>
        <span className={trend >= 0 ? 'trend-pill positive' : 'trend-pill negative'}>{trend >= 0 ? '+' : ''}{trend}</span>
      </div>

      <div className="insight-grid">
        <Metric icon={Flame} label="Current streak" value={`${streaks.current}d`} />
        <Metric icon={BarChart3} label="Best streak" value={`${streaks.best}d`} />
        <Metric icon={Check} label="Perfect days" value={`${perfectDays}/7`} />
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Achievements</h2>
          <span>{achievements.filter((a) => a.unlocked).length}/{achievements.length} unlocked</span>
        </div>
        <div className="achievements-shelf">
          {achievements.map((achievement) => {
            const Icon = achievementIcons[achievement.icon]
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

      <div className="panel-section">
        <div className="section-heading">
          <h2>Momentum</h2>
          <span>{lastThreeRate}%</span>
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
          <h2>This week</h2>
          <span>{activeHabits.length} habits</span>
        </div>
        <div className="week-grid">
          {weekKeys.map((dateKey, index) => {
            const count = checkins.filter((checkin) => checkin.date === dateKey && activeHabits.some((habit) => habit.id === checkin.habitId)).length
            const height = activeHabits.length ? Math.max(10, Math.round((count / activeHabits.length) * 54)) : 10

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

      <div className="panel-section">
        <div className="section-heading">
          <h2>7-Day Matrix</h2>
          <span>All habits</span>
        </div>
        <div className="habit-matrix">
          <div className="matrix-header">
            <div className="matrix-label"></div>
            {currentSevenKeys.map((dateKey, index) => (
              <div key={dateKey} className="matrix-day-label">{dateLabels[index]}</div>
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
                  <div key={`${habit.id}-${dateKey}`} className={`matrix-cell ${isDone ? `done ${habit.color}` : ''}`}>
                    {isDone && <Check size={14} strokeWidth={3} />}
                  </div>
                )
              })}
            </div>
          ))}
          {activeHabits.length === 0 && (
            <p className="helper-copy" style={{ padding: '8px 0' }}>Add a habit to see your 7-day matrix.</p>
          )}
        </div>
      </div>

      <div className="coach-grid">
        <div className="coach-card">
          <span>Best day</span>
          <strong>{bestDay?.rate ? bestDay.dateKey.slice(5).replace('-', '/') : '—'}</strong>
          <p>{bestDay?.rate ? `${bestDay.rate}%` : ''}</p>
        </div>
        <div className="coach-card">
          <span>Best rhythm</span>
          <strong>{bestWeekday?.rate ? bestWeekday.label : '—'}</strong>
          <p>{bestWeekday?.rate ? `${bestWeekday.rate}%` : ''}</p>
        </div>
        <div className="coach-card">
          <span>Focus</span>
          <strong>{focusHabit?.habit.name ?? '—'}</strong>
          <p>{focusHabit ? `${focusHabit.rate}%` : ''}</p>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Habit health</h2>
          <span>Last 14 days</span>
        </div>
        <div className="habit-health-list">
          {habitBreakdown.length === 0 ? (
            <InlineMessage message="Your per-habit insight will appear after you add a habit." />
          ) : (
            habitBreakdown.map(({ habit, recentDone, rate, habitStreak, targetTotal }) => (
              <div className="health-row" key={habit.id}>
                <HabitIdentity habit={habit} />
                <div className="health-meter" aria-label={`${habit.name} completion ${rate}%`}>
                  <span style={{ width: `${rate}%` }} />
                </div>
                <strong>{rate}%</strong>
                <small>
                  {isWeeklyHabit(habit) ? `${recentDone}/${targetTotal} target` : `${recentDone}/14`} · {habitStreak}d streak
                </small>
              </div>
            ))
          )}
        </div>
      </div>

      {activeHabits.length > 0 && (
        <div className="insight-pair">
          <div className="mini-insight">
            <span>Strongest</span>
            <strong>{strongestHabit?.habit.name ?? '—'}</strong>
            <p>{strongestHabit ? `${strongestHabit.rate}%` : ''}</p>
          </div>
          <div className="mini-insight">
            <span>Focus</span>
            <strong>{focusHabit?.habit.name ?? '—'}</strong>
            <p>{focusHabit ? `${focusHabit.rate}%` : ''}</p>
          </div>
        </div>
      )}

      <ActivityCalendar
        activeHabits={activeHabits}
        checkins={checkins}
        moods={moods}
        doneIdsForDate={doneIdsForDate}
      />

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
  onSignOut,
}: {
  photoURL?: string | null
  displayName?: string | null
  email?: string | null
  prefs: NotificationPrefs
  onEnableReminders: () => Promise<void>
  onDisableReminders: () => Promise<void>
  onSavePrefs: (updates: Partial<NotificationPrefs>) => Promise<void>
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

      <button className="secondary-action danger" type="button" onClick={onSignOut}>
        <LogOut size={20} />
        <span>Sign out</span>
      </button>
    </section>
  )
}

function HabitSheet({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit | null
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
      <div className="app-mark">
        <Leaf size={32} />
      </div>
      <p>Bujo</p>
    </div>
  )
}

function ConfigScreen() {
  return (
    <div className="auth-screen">
      <div className="app-mark">
        <Leaf size={31} />
      </div>
      <h1>Connect Firebase</h1>
      <p>Add your Firebase values to `.env.local`, then restart the dev server.</p>
    </div>
  )
}

function SignInScreen({ error, onSignIn }: { error: string | null; onSignIn: () => Promise<void> }) {
  return (
    <div className="auth-screen">
      <div className="app-mark">
        <Leaf size={31} />
      </div>
      <p className="eyebrow">Bujo</p>
      <h1>Small habits, beautifully kept.</h1>
      <p>Sign in with Google to sync your routines, streaks, reminders, and timers.</p>
      {error && <InlineMessage tone="warning" message={error} />}
      <button className="google-button" type="button" onClick={onSignIn}>
        <span aria-hidden="true">G</span>
        Continue with Google
        <ChevronRight size={19} />
      </button>
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
  cheersSentToday,
  cheersReceivedToday,
  cheersSent,
  cheersReceived,
  onFollow,
  onUnfollow,
  onSendCheer,
  onTogglePrivacy,
}: {
  myProfile: FriendProfile | null
  friends: FriendProfile[]
  loading: boolean
  cheersSentToday: Set<string>
  cheersReceivedToday: number
  cheersSent: Cheer[]
  cheersReceived: Cheer[]
  onFollow: (code: string) => Promise<{ success: boolean; message: string }>
  onUnfollow: (uid: string) => Promise<void>
  onSendCheer: (uid: string, type?: CheerType) => Promise<void>
  onTogglePrivacy: (isPublic: boolean) => Promise<void>
}) {
  const [friendCode, setFriendCode] = useState('')
  const [followMessage, setFollowMessage] = useState<string | null>(null)
  const [followError, setFollowError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [cheeringUid, setCheeringUid] = useState<string | null>(null)
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

  const getActivityMeta = (lastActive: string) => {
    const daysAgo = differenceInCalendarDays(new Date(), dateFromKey(lastActive))

    if (daysAgo <= 0) return { label: 'Active today', tone: 'fresh' }
    if (daysAgo === 1) return { label: 'Active yesterday', tone: 'warm' }
    if (daysAgo <= 7) return { label: `${daysAgo}d ago`, tone: 'warm' }

    return { label: 'Quiet lately', tone: 'quiet' }
  }

  const cheerActions: Array<{ type: CheerType; label: string; icon: LucideIcon }> = [
    { type: 'spark', label: 'Spark', icon: Sparkles },
    { type: 'clap', label: 'Bravo', icon: PartyPopper },
    { type: 'fire', label: 'Fire', icon: Flame },
    { type: 'crown', label: 'Crown', icon: Crown },
  ]

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
