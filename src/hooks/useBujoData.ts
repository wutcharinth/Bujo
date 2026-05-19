import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDateKey } from '../lib/dates'
import { normalizeWeeklyTarget } from '../lib/habitGoals'
import { getPlatformHints } from '../lib/notifications'
import { getUserTimeZone } from '../lib/reminders'
import type { Checkin, Habit, MoodCheckin, MoodValue, NewHabitInput, NotificationPrefs, TimeOfDay, WeekDay } from '../types'

const defaultPrefs = (): NotificationPrefs => ({
  enabled: false,
  reminderTime: '20:00',
  timezone: getUserTimeZone(),
})

const DATA_LOAD_TIMEOUT_MS = 7000

function userPath(uid: string) {
  return `users/${uid}`
}

export function toHabitWrite(input: NewHabitInput): NewHabitInput {
  return {
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    frequency: input.frequency === 'weekly' ? 'weekly' : 'daily',
    weeklyTarget: normalizeWeeklyTarget(input.weeklyTarget),
    weeklyDays: Array.isArray(input.weeklyDays) ? [...input.weeklyDays].sort() : [],
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderTime || '20:00',
    timerEnabled: input.timerEnabled,
    timerMinutes: Math.min(180, Math.max(1, Number(input.timerMinutes) || 1)),
  }
}

function parseWeeklyDays(raw: unknown): WeekDay[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is WeekDay => typeof v === 'number' && v >= 0 && v <= 6).sort()
}

function mapHabit(id: string, data: Record<string, unknown>): Habit {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Untitled habit',
    icon: typeof data.icon === 'string' ? (data.icon as Habit['icon']) : 'sparkles',
    color: typeof data.color === 'string' ? (data.color as Habit['color']) : 'blue',
    active: data.active !== false,
    frequency: data.frequency === 'weekly' ? 'weekly' : 'daily',
    weeklyTarget: normalizeWeeklyTarget(data.weeklyTarget),
    weeklyDays: parseWeeklyDays(data.weeklyDays),
    reminderEnabled: data.reminderEnabled === true,
    reminderTime: typeof data.reminderTime === 'string' ? data.reminderTime : '20:00',
    lastReminderDate: typeof data.lastReminderDate === 'string' ? data.lastReminderDate : undefined,
    timerEnabled: data.timerEnabled === true,
    timerMinutes: typeof data.timerMinutes === 'number' ? data.timerMinutes : 5,
  }
}

function mapCheckin(id: string, data: Record<string, unknown>): Checkin {
  return {
    id,
    habitId: typeof data.habitId === 'string' ? data.habitId : '',
    date: typeof data.date === 'string' ? data.date : '',
  }
}

function mapMoodCheckin(id: string, data: Record<string, unknown>): MoodCheckin {
  return {
    id,
    date: typeof data.date === 'string' ? data.date : '',
    timeOfDay: data.timeOfDay === 'morning' || data.timeOfDay === 'evening' ? data.timeOfDay : 'morning',
    value: ['terrible', 'bad', 'okay', 'good', 'great'].includes(data.value as string) ? (data.value as MoodValue) : 'okay',
  }
}

export function useBujoData(user: User | null) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [moods, setMoods] = useState<MoodCheckin[]>([])
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs)
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !db) {
      return
    }

    const basePath = userPath(user.uid)
    let receivedInitialHabitSnapshot = false
    const loadingTimeout = window.setTimeout(() => {
      if (!receivedInitialHabitSnapshot) {
        setError(
          'Bujo is taking longer than expected to reach Firestore. Check your connection, Firebase Auth domains, or Firestore rules.',
        )
        setLoading(false)
      }
    }, DATA_LOAD_TIMEOUT_MS)

    const unsubscribeHabits = onSnapshot(
      query(collection(db, basePath, 'habits'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        receivedInitialHabitSnapshot = true
        setHabits(snapshot.docs.map((item) => mapHabit(item.id, item.data())))
        setError(null)
        setLoading(false)
      },
      (snapshotError) => {
        receivedInitialHabitSnapshot = true
        setError(`Could not load habits: ${snapshotError.message}`)
        setLoading(false)
      },
    )

    const unsubscribeCheckins = onSnapshot(
      collection(db, basePath, 'checkins'),
      (snapshot) => {
        setCheckins(
          snapshot.docs
            .map((item) => mapCheckin(item.id, item.data()))
            .filter((checkin) => checkin.habitId && checkin.date),
        )
      },
      (snapshotError) => setError(snapshotError.message),
    )

    const unsubscribeMoods = onSnapshot(
      collection(db, basePath, 'moods'),
      (snapshot) => {
        setMoods(
          snapshot.docs
            .map((item) => mapMoodCheckin(item.id, item.data()))
            .filter((mood) => mood.date && mood.value),
        )
      },
      (snapshotError) => setError(snapshotError.message),
    )

    const prefsRef = doc(db, basePath, 'notificationPrefs', 'main')
    const unsubscribePrefs = onSnapshot(
      prefsRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          const initialPrefs = defaultPrefs()
          setPrefs(initialPrefs)
          await setDoc(
            prefsRef,
            {
              ...initialPrefs,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch((prefsError: unknown) => {
            const message = prefsError instanceof Error ? prefsError.message : 'Could not create reminder settings.'
            setError(message)
          })
          return
        }

        setPrefs({ ...defaultPrefs(), ...(snapshot.data() as Partial<NotificationPrefs>) })
      },
      (snapshotError) => setError(snapshotError.message),
    )

    return () => {
      window.clearTimeout(loadingTimeout)
      unsubscribeHabits()
      unsubscribeCheckins()
      unsubscribeMoods()
      unsubscribePrefs()
    }
  }, [user])

  const activeHabits = useMemo(() => habits.filter((habit) => habit.active), [habits])

  const addHabit = useCallback(
    async (input: NewHabitInput) => {
      if (!user || !db) return

      const habitWrite = toHabitWrite(input)
      await addDoc(collection(db, userPath(user.uid), 'habits'), {
        ...habitWrite,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const updateHabit = useCallback(
    async (habitId: string, input: NewHabitInput) => {
      if (!user || !db) return

      await updateDoc(doc(db, userPath(user.uid), 'habits', habitId), {
        ...toHabitWrite(input),
        updatedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const archiveHabit = useCallback(
    async (habitId: string) => {
      if (!user || !db) return

      await updateDoc(doc(db, userPath(user.uid), 'habits', habitId), {
        active: false,
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const toggleToday = useCallback(
    async (habitId: string, completed: boolean) => {
      if (!user || !db) return

      const date = getDateKey()
      const checkinId = `${date}_${habitId}`
      const checkinRef = doc(db, userPath(user.uid), 'checkins', checkinId)

      if (completed) {
        await deleteDoc(checkinRef)
        return
      }

      await setDoc(checkinRef, {
        habitId,
        date,
        completedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const setMood = useCallback(
    async (timeOfDay: TimeOfDay, value: MoodValue) => {
      if (!user || !db) return

      const date = getDateKey()
      const moodId = `${date}_${timeOfDay}`
      const moodRef = doc(db, userPath(user.uid), 'moods', moodId)

      await setDoc(moodRef, {
        date,
        timeOfDay,
        value,
        updatedAt: serverTimestamp(),
      })
    },
    [user],
  )

  const saveNotificationPrefs = useCallback(
    async (updates: Partial<NotificationPrefs>) => {
      if (!user || !db) return

      const nextPrefs = {
        ...updates,
        timezone: updates.timezone ?? prefs.timezone ?? getUserTimeZone(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, userPath(user.uid), 'notificationPrefs', 'main'), nextPrefs, {
        merge: true,
      })
    },
    [prefs.timezone, user],
  )

  const saveFcmToken = useCallback(
    async (token: string) => {
      if (!user || !db) return

      await setDoc(
        doc(db, userPath(user.uid), 'fcmTokens', token),
        {
          token,
          ...getPlatformHints(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    },
    [user],
  )

  return {
    habits,
    activeHabits,
    checkins,
    moods,
    prefs,
    loading,
    error,
    addHabit,
    updateHabit,
    archiveHabit,
    toggleToday,
    setMood,
    saveNotificationPrefs,
    saveFcmToken,
  }
}
