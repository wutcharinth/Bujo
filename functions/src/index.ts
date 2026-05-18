import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging, type TokenMessage } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'

initializeApp()

const db = getFirestore()
const messaging = getMessaging()
const appUrl = process.env.APP_URL ?? 'https://bujobloom.web.app'

interface ReminderPrefs {
  enabled?: boolean
  timezone?: string
}

interface HabitReminder {
  name?: string
  active?: boolean
  reminderEnabled?: boolean
  reminderTime?: string
  lastReminderDate?: string
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 20 * 60
  }

  return hours * 60 + minutes
}

function getLocalParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'

  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  }
}

function isReminderDue(habit: HabitReminder, timezone: string, now: Date) {
  if (!habit.active || !habit.reminderEnabled) return false

  const local = getLocalParts(now, timezone)
  if (habit.lastReminderDate === local.dateKey) return false

  const elapsed = local.minutes - timeToMinutes(habit.reminderTime ?? '20:00')
  return elapsed >= 0 && elapsed < 15
}

function isInvalidTokenCode(code?: string) {
  return (
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-argument'
  )
}

export const sendDailyHabitReminders = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    const now = new Date()
    const habitsSnapshot = await db
      .collectionGroup('habits')
      .where('active', '==', true)
      .where('reminderEnabled', '==', true)
      .get()
    let sentUsers = 0
    let sentMessages = 0

    for (const habitDoc of habitsSnapshot.docs) {
      const habit = habitDoc.data() as HabitReminder
      const userRef = habitDoc.ref.parent.parent

      if (!userRef) {
        continue
      }

      const prefsSnapshot = await userRef.collection('notificationPrefs').doc('main').get()
      const prefs = prefsSnapshot.data() as ReminderPrefs | undefined
      const timezone = prefs?.timezone ?? 'UTC'

      if (!prefs?.enabled || !isReminderDue(habit, timezone, now)) {
        continue
      }

      const local = getLocalParts(now, timezone)
      const tokensSnapshot = await userRef.collection('fcmTokens').get()
      const habitName = habit.name ?? 'your habit'
      const messages: TokenMessage[] = tokensSnapshot.docs.map((tokenDoc) => ({
        token: tokenDoc.id,
        notification: {
          title: 'Bujo',
          body: `Time for ${habitName}. A small check-in is waiting.`,
        },
        data: {
          type: 'habit-reminder',
          habitId: habitDoc.id,
          date: local.dateKey,
        },
        webpush: {
          fcmOptions: {
            link: appUrl,
          },
          notification: {
            icon: `${appUrl}/pwa-192.png`,
            badge: `${appUrl}/pwa-192.png`,
            tag: `bujo-${habitDoc.id}-${local.dateKey}`,
            renotify: false,
          },
        },
      }))

      if (messages.length === 0) {
        await habitDoc.ref.set(
          {
            lastReminderDate: local.dateKey,
            lastCheckedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        continue
      }

      const response = await messaging.sendEach(messages)
      sentUsers += 1
      sentMessages += response.successCount

      await Promise.all(
        response.responses.map(async (result, index) => {
          const code = result.error?.code
          if (isInvalidTokenCode(code)) {
            await tokensSnapshot.docs[index].ref.delete()
          }
        }),
      )

      await habitDoc.ref.set(
        {
          lastReminderDate: local.dateKey,
          lastReminderSentAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }

    logger.info('Bujo habit reminders checked', { sentUsers, sentMessages })
  },
)
