import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BarChart3,
  Bell,
  BellOff,
  Bike,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudRain,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Frown,
  Heart,
  Home,
  Info,
  Laugh,
  Leaf,
  LogOut,
  Meh,
  Moon,
  Music,
  Pause,
  Pencil,
  Pill,
  Play,
  Plus,
  RotateCcw,
  Settings,
  ShowerHead,
  Smartphone,
  Smile,
  Sparkles,
  Sun,
  Timer,
  Utensils,
  WashingMachine,
  X,
  Beer,
  GlassWater,
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useBujoData } from './hooks/useBujoData'
import { dateFromKey, getDateKey, getRecentDateKeys, getWeekDateKeys } from './lib/dates'
import { getHabitCadenceLabel, getHabitGoalProgress, getWindowGoalStats, isWeeklyHabit, normalizeWeeklyTarget, WEEKDAY_SHORT } from './lib/habitGoals'
import { calculateStreaks } from './lib/habitStats'
import { getNotificationHelpText, requestPushToken } from './lib/notifications'
import { getUserTimeZone } from './lib/reminders'
import type { DrinkCheckin, Habit, HabitColor, HabitIcon, MoodCheckin, MoodValue, NewHabitInput, NotificationPrefs, TimeOfDay, WeekDay } from './types'

type TabId = 'today' | 'habits' | 'progress' | 'settings'

const habitIcons: Record<HabitIcon, LucideIcon> = {
  bike: Bike,
  book: BookOpen,
  brain: Brain,
  coffee: Coffee,
  drop: Droplets,
  dumbbell: Dumbbell,
  heart: Heart,
  laundry: WashingMachine,
  leaf: Leaf,
  moon: Moon,
  music: Music,
  pencil: Pencil,
  pill: Pill,
  shower: ShowerHead,
  sparkles: Sparkles,
  steps: Footprints,
  sun: Sun,
  utensils: Utensils,
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
}

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'habits', label: 'Habits', icon: Check },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
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
  const onTrackCount = useMemo(
    () =>
      bujo.activeHabits.filter((habit) => getHabitGoalProgress(habit, bujo.checkins, todayKey, currentWeekKeys).onTrack)
        .length,
    [bujo.activeHabits, bujo.checkins, currentWeekKeys, todayKey],
  )
  const progress = bujo.activeHabits.length ? onTrackCount / bujo.activeHabits.length : 0
  const greetingName = authState.user?.displayName?.split(' ')[0] ?? 'there'

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
                streak={appStreaks.current}
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
                streaks={appStreaks}
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
        <h2>Daily Mood</h2>
        <span>Check in</span>
      </div>
      <div className="mood-tracker">
        <div className="mood-row">
          <span>Sleep Quality</span>
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
          <span>Day Feeling</span>
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
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol', delta: number) => Promise<void>
}) {
  const todayKey = getDateKey()
  const todaysDrinks = drinks.find((d) => d.date === todayKey) || { water: 0, coffee: 0, alcohol: 0 }

  const handleContext = (e: React.MouseEvent, type: 'water' | 'coffee' | 'alcohol') => {
    e.preventDefault()
    onUpdateDrink(type, -1)
  }

  return (
    <div className="panel-section">
      <div className="section-heading">
        <h2>Daily Drinks</h2>
        <span>Tap +, Long press -</span>
      </div>
      <div className="drinks-tracker">
        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('water', 1)}
          onContextMenu={(e) => handleContext(e, 'water')}
        >
          <div className="drink-icon water"><GlassWater size={24} /></div>
          <strong>{todaysDrinks.water}</strong>
          <span>Water</span>
        </button>

        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('coffee', 1)}
          onContextMenu={(e) => handleContext(e, 'coffee')}
        >
          <div className="drink-icon coffee"><Coffee size={24} /></div>
          <strong>{todaysDrinks.coffee}</strong>
          <span>Coffee</span>
        </button>

        <button 
          className="drink-btn" 
          type="button" 
          onClick={() => onUpdateDrink('alcohol', 1)}
          onContextMenu={(e) => handleContext(e, 'alcohol')}
        >
          <div className="drink-icon alcohol"><Beer size={24} /></div>
          <strong>{todaysDrinks.alcohol}</strong>
          <span>Alcohol</span>
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
  onUpdateDrink: (type: 'water' | 'coffee' | 'alcohol', delta: number) => Promise<void>
}) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
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
          <h2>{activeHabits.length ? `${onTrackCount} of ${activeHabits.length} on track` : 'Start small today'}</h2>
          <p>{activeHabits.length ? 'Tiny wins count. Weekly habits can land any day.' : 'One gentle habit is enough to begin.'}</p>
        </div>
        <div className="progress-ring" style={{ '--progress': `${progressPercent}%` } as CSSProperties}>
          <span>{progressPercent}</span>
          <small>%</small>
        </div>
      </div>

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
              <HabitBadges habit={habit} accessory={habit.timerEnabled ? `${habit.timerMinutes}m` : undefined} />
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

function ProgressView({
  activeHabits,
  checkins,
  moods,
  streaks,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  moods: MoodCheckin[]
  streaks: { current: number; best: number; total: number }
}) {
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
  const previousThreeKeys = recentKeys.slice(-6, -3)
  const lastThreeRate = getWindowGoalStats(activeHabits, activeCheckins, lastThreeKeys).rate
  const previousThreeRate = getWindowGoalStats(activeHabits, activeCheckins, previousThreeKeys).rate
  const shortTrend = lastThreeRate - previousThreeRate
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
  const insight =
    activeHabits.length === 0
      ? 'Add a few habits to unlock trends.'
      : trend > 0
        ? `Momentum is up ${trend} points vs. the previous week.`
        : trend < 0
          ? `Momentum is down ${Math.abs(trend)} points. Keep the next check-in easy.`
          : 'Momentum is steady. Consistency is doing its quiet work.'

  return (
    <section className="screen-stack" aria-label="Progress">
      <div className="insight-hero">
        <div>
          <p className="panel-kicker">Dashboard · {dashboardMood}</p>
          <h2>{currentRate}%</h2>
          <p>{insight}</p>
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
          <h2>Momentum</h2>
          <span>{lastThreeRate}% last 3 days</span>
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
        <p className="dashboard-note">
          {shortTrend >= 0 ? '+' : ''}{shortTrend} points vs. the 3 days before.
        </p>
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

      <div className="coach-grid">
        <div className="coach-card">
          <span>Best day</span>
          <strong>{bestDay?.rate ? bestDay.dateKey.slice(5).replace('-', '/') : 'None yet'}</strong>
          <p>{bestDay?.rate ? `${bestDay.rate}% complete across active habits.` : 'Complete one habit to start the map.'}</p>
        </div>
        <div className="coach-card">
          <span>Best rhythm</span>
          <strong>{bestWeekday?.rate ? bestWeekday.label : 'None yet'}</strong>
          <p>{bestWeekday?.rate ? `${bestWeekday.rate}% average over the last 4 weeks.` : 'Weekday patterns appear after check-ins.'}</p>
        </div>
        <div className="coach-card">
          <span>Next move</span>
          <strong>{focusHabit?.habit.name ?? 'Add habit'}</strong>
          <p>{focusHabit ? 'Make this one the easiest check-in today.' : 'Create one habit you can finish in under two minutes.'}</p>
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
            <strong>{strongestHabit?.habit.name ?? 'None yet'}</strong>
            <p>{strongestHabit ? `${strongestHabit.rate}% over the last 14 days.` : 'Keep checking in.'}</p>
          </div>
          <div className="mini-insight">
            <span>Focus next</span>
            <strong>{focusHabit?.habit.name ?? 'None yet'}</strong>
            <p>
              {focusHabit
                ? `${focusHabit.recentDone}/${isWeeklyHabit(focusHabit.habit) ? focusHabit.targetTotal : 14} recently. Make this one tiny.`
                : 'Add a habit to start.'}
            </p>
          </div>
        </div>
      )}

      <ActivityCalendar
        activeHabits={activeHabits}
        checkins={checkins}
        moods={moods}
        doneIdsForDate={doneIdsForDate}
      />
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
  prefs: { enabled: boolean; timezone: string; sound?: string; theme?: string; themeColor?: string }
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
          <h2>Device reminders</h2>
          {prefs.enabled ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <p className="helper-copy">
          Enable this once, then set reminder times inside each habit. {getNotificationHelpText()}
        </p>
        <button
          className={prefs.enabled ? 'secondary-action' : 'primary-action'}
          type="button"
          disabled={saving}
          onClick={() => run(prefs.enabled ? onDisableReminders : onEnableReminders)}
        >
          {prefs.enabled ? <BellOff size={20} /> : <Bell size={20} />}
          <span>{prefs.enabled ? 'Turn off reminders' : 'Enable reminders'}</span>
        </button>
      </div>

      <div className="panel-section">
        <div className="settings-note">
          <Smartphone size={20} />
          <p>For iPhone notifications, open Bujo from the Home Screen on iOS 16.4 or later after enabling device reminders.</p>
        </div>
      </div>

      {prefs.enabled && (
        <div className="panel-section">
          <div className="section-heading">
            <h2>Notification Sound</h2>
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
            onChange={(e) => run(() => onSavePrefs({ theme: e.target.value as any }))}
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
          <h2>{habit ? 'Edit habit' : 'New habit'}</h2>
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
          <div className="compact-label">
            <span>Icon</span>
            <small>{Object.keys(habitIcons).length} choices</small>
          </div>
          <div className="icon-picker">
            {(Object.keys(habitIcons) as HabitIcon[]).map((iconKey) => {
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
        <Icon size={21} />
      </span>
      <strong>{habit.name}</strong>
    </div>
  )
}

function EmptyHabits({ onAddHabit }: { onAddHabit: () => void }) {
  return (
    <div className="empty-panel">
      <Sparkles size={24} />
      <h2>Tiny habits, no drama.</h2>
      <p>Create one habit you can finish today. Keep it small enough to feel almost too easy.</p>
      <div className="empty-actions">
        <button className="primary-action" type="button" onClick={onAddHabit}>
          <Plus size={19} />
          <span>Add first habit</span>
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
        <Check size={32} />
      </div>
      <p>Bujo</p>
    </div>
  )
}

function ConfigScreen() {
  return (
    <div className="auth-screen">
      <div className="app-mark">
        <Check size={31} />
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
        <Check size={31} />
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
  return 'Settings'
}

export default App
