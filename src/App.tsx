import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BarChart3,
  Bell,
  BellOff,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Home,
  Info,
  Leaf,
  LogOut,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  Sun,
  Timer,
  X,
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { starterHabits, useBujoData } from './hooks/useBujoData'
import { getDateKey, getRecentDateKeys, getWeekDateKeys } from './lib/dates'
import { calculateStreaks } from './lib/habitStats'
import { getNotificationHelpText, requestPushToken } from './lib/notifications'
import { getUserTimeZone } from './lib/reminders'
import type { Habit, HabitColor, HabitIcon, NewHabitInput } from './types'

type TabId = 'today' | 'habits' | 'progress' | 'settings'

const habitIcons: Record<HabitIcon, LucideIcon> = {
  book: BookOpen,
  drop: Droplets,
  dumbbell: Dumbbell,
  heart: Heart,
  leaf: Leaf,
  moon: Moon,
  pencil: Pencil,
  sparkles: Sparkles,
  steps: Footprints,
  sun: Sun,
}

const colorNames: Record<HabitColor, string> = {
  blue: 'Blue',
  green: 'Green',
  coral: 'Coral',
  gold: 'Gold',
  violet: 'Violet',
  gray: 'Gray',
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

type HabitTemplate = NewHabitInput & {
  description: string
  category: 'Body' | 'Mind' | 'Focus' | 'Evening'
}

const habitTemplates: HabitTemplate[] = [
  {
    name: 'Morning walk',
    description: '10 minutes outside',
    category: 'Body',
    icon: 'steps',
    color: 'green',
    reminderEnabled: true,
    reminderTime: '07:30',
    timerEnabled: true,
    timerMinutes: 10,
  },
  {
    name: 'Read 20',
    description: 'A clean reading block',
    category: 'Mind',
    icon: 'book',
    color: 'gold',
    reminderEnabled: true,
    reminderTime: '21:00',
    timerEnabled: true,
    timerMinutes: 20,
  },
  {
    name: 'Meditate',
    description: 'Settle for five',
    category: 'Mind',
    icon: 'sparkles',
    color: 'violet',
    reminderEnabled: true,
    reminderTime: '08:00',
    timerEnabled: true,
    timerMinutes: 5,
  },
  {
    name: 'Deep work',
    description: 'One focused sprint',
    category: 'Focus',
    icon: 'pencil',
    color: 'blue',
    reminderEnabled: true,
    reminderTime: '10:00',
    timerEnabled: true,
    timerMinutes: 45,
  },
  {
    name: 'Stretch',
    description: 'Reset your body',
    category: 'Body',
    icon: 'heart',
    color: 'coral',
    reminderEnabled: true,
    reminderTime: '17:30',
    timerEnabled: true,
    timerMinutes: 8,
  },
  {
    name: 'Plan tomorrow',
    description: 'Close the day calmly',
    category: 'Evening',
    icon: 'moon',
    color: 'gray',
    reminderEnabled: true,
    reminderTime: '21:30',
    timerEnabled: false,
    timerMinutes: 5,
  },
]

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

  const completedToday = useMemo(
    () => new Set(bujo.checkins.filter((checkin) => checkin.date === todayKey).map((checkin) => checkin.habitId)),
    [bujo.checkins, todayKey],
  )

  const allCheckinDates = useMemo(() => bujo.checkins.map((checkin) => checkin.date), [bujo.checkins])
  const appStreaks = useMemo(() => calculateStreaks(allCheckinDates), [allCheckinDates])
  const progress = bujo.activeHabits.length ? completedToday.size / bujo.activeHabits.length : 0
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
                completedToday={completedToday}
                progress={progress}
                streak={appStreaks.current}
                onAddHabit={openCreateSheet}
                onSeed={bujo.seedStarterHabits}
                onToggle={bujo.toggleToday}
              />
            )}
            {activeTab === 'habits' && (
              <HabitsView
                habits={bujo.habits}
                onAddHabit={openCreateSheet}
                onAddTemplate={async (template) => {
                  await bujo.addHabit(template)
                  setNotice(`${template.name} added to Bujo.`)
                }}
                onArchive={bujo.archiveHabit}
                onEdit={openEditSheet}
              />
            )}
            {activeTab === 'progress' && (
              <ProgressView activeHabits={bujo.activeHabits} checkins={bujo.checkins} streaks={appStreaks} />
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

function TodayView({
  activeHabits,
  checkins,
  completedToday,
  progress,
  streak,
  onAddHabit,
  onSeed,
  onToggle,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  completedToday: Set<string>
  progress: number
  streak: number
  onAddHabit: () => void
  onSeed: () => Promise<void>
  onToggle: (habitId: string, completed: boolean) => Promise<void>
}) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const completedCount = completedToday.size
  const progressPercent = Math.round(progress * 100)

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
          <h2>{activeHabits.length ? `${completedCount} of ${activeHabits.length} done` : 'Start small today'}</h2>
          <p>{activeHabits.length ? 'A quiet check-in keeps the day moving.' : 'Pick a few habits and Bujo will keep it light.'}</p>
        </div>
        <div className="progress-ring" style={{ '--progress': `${progressPercent}%` } as CSSProperties}>
          <span>{progressPercent}</span>
          <small>%</small>
        </div>
      </div>

      <div className="metric-strip">
        <Metric icon={Flame} label="Current streak" value={`${streak}d`} />
        <Metric icon={Check} label="Today" value={`${completedCount}/${activeHabits.length}`} />
      </div>

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
        <EmptyHabits onAddHabit={onAddHabit} onSeed={onSeed} />
      ) : (
        <div className="habit-list">
          {activeHabits.map((habit) => {
            const completed = completedToday.has(habit.id)
            const dates = checkins.filter((checkin) => checkin.habitId === habit.id).map((checkin) => checkin.date)
            const habitStreak = calculateStreaks(dates).current

            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                completed={completed}
                accessory={`${habitStreak}d`}
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
  onAddTemplate,
  onArchive,
  onEdit,
}: {
  habits: Habit[]
  onAddHabit: () => void
  onAddTemplate: (template: NewHabitInput) => Promise<void>
  onArchive: (habitId: string) => Promise<void>
  onEdit: (habit: Habit) => void
}) {
  const activeHabits = habits.filter((habit) => habit.active)
  const activeHabitNames = new Set(activeHabits.map((habit) => habit.name.trim().toLowerCase()))

  return (
    <section className="screen-stack" aria-label="Habits">
      <button className="primary-action" type="button" onClick={onAddHabit}>
        <Plus size={20} />
        <span>New habit</span>
      </button>

      <div className="panel-section">
        <div className="section-heading">
          <h2>Suggested habits</h2>
          <span>{habitTemplates.length} templates</span>
        </div>
        <div className="template-grid">
          {habitTemplates.map((template) => {
            const Icon = habitIcons[template.icon]
            const isAdded = activeHabitNames.has(template.name.toLowerCase())

            return (
              <button
                className="template-card"
                type="button"
                key={template.name}
                disabled={isAdded}
                onClick={() => onAddTemplate(template)}
              >
                <span className={`habit-glyph ${template.color}`}>
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                </span>
                <em>{isAdded ? 'Added' : template.category}</em>
              </button>
            )
          })}
        </div>
      </div>

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

function ProgressView({
  activeHabits,
  checkins,
  streaks,
}: {
  activeHabits: Habit[]
  checkins: Array<{ habitId: string; date: string }>
  streaks: { current: number; best: number; total: number }
}) {
  const weekKeys = getWeekDateKeys()
  const recentKeys = getRecentDateKeys(14)
  const currentSevenKeys = recentKeys.slice(7)
  const previousSevenKeys = recentKeys.slice(0, 7)
  const dateLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const activeHabitIds = new Set(activeHabits.map((habit) => habit.id))
  const activeCheckins = checkins.filter((checkin) => activeHabitIds.has(checkin.habitId))
  const completedDates = new Set(activeCheckins.map((checkin) => checkin.date))
  const countCompletions = (dateKeys: string[]) => activeCheckins.filter((checkin) => dateKeys.includes(checkin.date)).length
  const possibleCurrent = activeHabits.length * currentSevenKeys.length
  const possiblePrevious = activeHabits.length * previousSevenKeys.length
  const currentCompletions = countCompletions(currentSevenKeys)
  const previousCompletions = countCompletions(previousSevenKeys)
  const currentRate = possibleCurrent ? Math.round((currentCompletions / possibleCurrent) * 100) : 0
  const previousRate = possiblePrevious ? Math.round((previousCompletions / possiblePrevious) * 100) : 0
  const trend = currentRate - previousRate
  const perfectDays = currentSevenKeys.filter((dateKey) => {
    const doneThatDay = new Set(activeCheckins.filter((checkin) => checkin.date === dateKey).map((checkin) => checkin.habitId))
    return activeHabits.length > 0 && activeHabits.every((habit) => doneThatDay.has(habit.id))
  }).length
  const habitBreakdown = activeHabits
    .map((habit) => {
      const habitDates = activeCheckins.filter((checkin) => checkin.habitId === habit.id).map((checkin) => checkin.date)
      const recentDone = recentKeys.filter((dateKey) => habitDates.includes(dateKey)).length
      const rate = Math.round((recentDone / recentKeys.length) * 100)
      const habitStreak = calculateStreaks(habitDates).current

      return { habit, recentDone, rate, habitStreak }
    })
    .sort((a, b) => b.rate - a.rate)
  const strongestHabit = habitBreakdown[0]
  const focusHabit = [...habitBreakdown].reverse().find((item) => item.rate < 80) ?? habitBreakdown[habitBreakdown.length - 1]
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
          <p className="panel-kicker">7-day completion</p>
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
          <h2>Habit health</h2>
          <span>Last 14 days</span>
        </div>
        <div className="habit-health-list">
          {habitBreakdown.length === 0 ? (
            <InlineMessage message="Your per-habit insight will appear after you add a habit." />
          ) : (
            habitBreakdown.map(({ habit, recentDone, rate, habitStreak }) => (
              <div className="health-row" key={habit.id}>
                <HabitIdentity habit={habit} />
                <div className="health-meter" aria-label={`${habit.name} completion ${rate}%`}>
                  <span style={{ width: `${rate}%` }} />
                </div>
                <strong>{rate}%</strong>
                <small>
                  {recentDone}/14 · {habitStreak}d streak
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
            <p>{focusHabit ? `${focusHabit.recentDone}/14 recently. Make this one tiny.` : 'Add a habit to start.'}</p>
          </div>
        </div>
      )}

      <div className="panel-section">
        <div className="section-heading">
          <h2>Last 14 days</h2>
          <span>Daily touchpoints</span>
        </div>
        <div className="dot-calendar">
          {recentKeys.map((dateKey) => {
            const hasCheckin = completedDates.has(dateKey)
            return <span className={hasCheckin ? 'filled' : ''} key={dateKey} title={dateKey} />
          })}
        </div>
      </div>
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
  onSignOut,
}: {
  photoURL?: string | null
  displayName?: string | null
  email?: string | null
  prefs: { enabled: boolean; timezone: string }
  onEnableReminders: () => Promise<void>
  onDisableReminders: () => Promise<void>
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
          <span>Icon</span>
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
          <span>Color</span>
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

        <div className="option-card">
          <label className="switch-row">
            <span>
              <Bell size={19} />
              Habit reminder
            </span>
            <input
              type="checkbox"
              checked={input.reminderEnabled}
              onChange={(event) => setInput((current) => ({ ...current, reminderEnabled: event.target.checked }))}
            />
          </label>
          {input.reminderEnabled && (
            <label className="time-row">
              <span>
                <Clock3 size={19} />
                Time
              </span>
              <input
                type="time"
                step="900"
                value={input.reminderTime}
                onChange={(event) => setInput((current) => ({ ...current, reminderTime: event.target.value }))}
              />
            </label>
          )}
          <p className="helper-copy">Bujo will remind you for this habit when device reminders are enabled.</p>
        </div>

        <div className="option-card">
          <label className="switch-row">
            <span>
              <Timer size={19} />
              Timer
            </span>
            <input
              type="checkbox"
              checked={input.timerEnabled}
              onChange={(event) => setInput((current) => ({ ...current, timerEnabled: event.target.checked }))}
            />
          </label>
          {input.timerEnabled && (
            <label className="time-row">
              <span>
                <Clock3 size={19} />
                Minutes
              </span>
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
            </label>
          )}
          <p className="helper-copy">Timers are for habits you want to spend a set amount of time on.</p>
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
  accessory,
  onClick,
  onStartTimer,
}: {
  habit: Habit
  completed: boolean
  accessory: string
  onClick: () => void
  onStartTimer: () => void
}) {
  return (
    <div className={completed ? 'habit-row completed' : 'habit-row'}>
      <button className="habit-main-button" type="button" onClick={onClick}>
        <HabitIdentity habit={habit} />
      </button>
      <div className="row-badges">
        <span className="row-meta">
          <Flame size={15} />
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
      <button className="check-control" type="button" onClick={onClick} aria-label={completed ? `Undo ${habit.name}` : `Complete ${habit.name}`}>
        {completed && <Check size={19} />}
      </button>
    </div>
  )
}

function HabitBadges({ habit, accessory, showTimer = true }: { habit: Habit; accessory?: string; showTimer?: boolean }) {
  if (!habit.reminderEnabled && !(showTimer && habit.timerEnabled) && !accessory) {
    return null
  }

  return (
    <>
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

function EmptyHabits({ onAddHabit, onSeed }: { onAddHabit: () => void; onSeed: () => Promise<void> }) {
  return (
    <div className="empty-panel">
      <Sparkles size={24} />
      <h2>Tiny habits, no drama.</h2>
      <p>Start with a few gentle defaults or add your own.</p>
      <div className="starter-grid">
        {starterHabits.map((habit) => {
          const Icon = habitIcons[habit.icon]
          return (
            <span className={`starter-chip ${habit.color}`} key={habit.name}>
              <Icon size={17} />
              {habit.name}
            </span>
          )
        })}
      </div>
      <div className="empty-actions">
        <button className="primary-action" type="button" onClick={onSeed}>
          <Sparkles size={19} />
          <span>Use starters</span>
        </button>
        <button className="secondary-action" type="button" onClick={onAddHabit}>
          <Plus size={19} />
          <span>Add my own</span>
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
