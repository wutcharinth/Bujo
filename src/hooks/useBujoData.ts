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
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDateKey } from '../lib/dates'
import { getPlatformHints } from '../lib/notifications'
import { getUserTimeZone } from '../lib/reminders'
import type { Checkin, Habit, NewHabitInput, NotificationPrefs } from '../types'

export const starterHabits: NewHabitInput[] = [
  {
    name: 'Drink water',
    icon: 'drop',
    color: 'blue',
    reminderEnabled: true,
    reminderTime: '09:00',
    timerEnabled: false,
    timerMinutes: 5,
  },
  {
    name: 'Read',
    icon: 'book',
    color: 'gold',
    reminderEnabled: true,
    reminderTime: '21:00',
    timerEnabled: true,
    timerMinutes: 20,
  },
  {
    name: 'Move',
    icon: 'steps',
    color: 'green',
    reminderEnabled: true,
    reminderTime: '18:00',
    timerEnabled: true,
    timerMinutes: 10,
  },
  {
    name: 'Sleep early',
    icon: 'moon',
    color: 'violet',
    reminderEnabled: true,
    reminderTime: '22:30',
    timerEnabled: false,
    timerMinutes: 5,
  },
]

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
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderTime || '20:00',
    timerEnabled: input.timerEnabled,
    timerMinutes: Math.min(180, Math.max(1, Number(input.timerMinutes) || 1)),
  }
}

function mapHabit(id: string, data: Record<string, unknown>): Habit {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Untitled habit',
    icon: typeof data.icon === 'string' ? (data.icon as Habit['icon']) : 'sparkles',
    color: typeof data.color === 'string' ? (data.color as Habit['color']) : 'blue',
    active: data.active !== false,
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

export function useBujoData(user: User | null) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
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

  const seedStarterHabits = useCallback(async () => {
    if (!user || !db) return

    const batch = writeBatch(db)
    const habitCollection = collection(db, userPath(user.uid), 'habits')

    for (const starter of starterHabits) {
      const habitRef = doc(habitCollection)
      batch.set(habitRef, {
        ...toHabitWrite(starter),
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    await batch.commit()
  }, [user])

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
    prefs,
    loading,
    error,
    addHabit,
    updateHabit,
    archiveHabit,
    toggleToday,
    seedStarterHabits,
    saveNotificationPrefs,
    saveFcmToken,
  }
}
