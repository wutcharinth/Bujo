import { getToken } from 'firebase/messaging'
import { getFirebaseMessaging } from './firebase'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { FCM } from '@capacitor-community/fcm'
import { LocalNotifications } from '@capacitor/local-notifications'

export type PushResult =
  | { status: 'granted'; token: string }
  | { status: 'denied'; message: string }
  | { status: 'unsupported'; message: string }
  | { status: 'missing-vapid'; message: string }
  | { status: 'error'; message: string }

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export function isStandalonePwa() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isLikelyIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function getPlatformHints() {
  return {
    isIos: isLikelyIos(),
    isStandalone: isStandalonePwa(),
    userAgent: navigator.userAgent,
    notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
  }
}

export function getNotificationHelpText() {
  if (Capacitor.isNativePlatform()) {
    return 'Reminders are fully supported natively. Tap the button to enable notifications for this device.'
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'This browser cannot receive push reminders, so Bujo will keep reminders inside the app.'
  }

  if (isLikelyIos() && !isStandalonePwa()) {
    return 'On iPhone, add Bujo to your Home Screen first. iOS 16.4 or later can then show Bujo reminders like a regular app.'
  }

  if (!VAPID_KEY) {
    return 'Add your Firebase Web Push certificate key to VITE_FIREBASE_VAPID_KEY to enable device reminders.'
  }

  return 'Bujo asks only after you tap the button. Each habit can then have its own reminder time.'
}

export async function requestPushToken(): Promise<PushResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      let perm = await PushNotifications.checkPermissions()
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions()
      }

      if (perm.receive !== 'granted') {
        return {
          status: 'denied',
          message: 'Notification permission denied. Enable Bujo reminders in system Settings.',
        }
      }

      // Register with Apple/Google push services (triggers APNs / FCM token generation)
      await PushNotifications.register()

      // Resolve the token dynamically via events
      return new Promise<PushResult>(async (resolve) => {
        let registrationListener: any = null
        let errorListener: any = null

        registrationListener = await PushNotifications.addListener('registration', async () => {
          if (registrationListener) registrationListener.remove()
          if (errorListener) errorListener.remove()
          
          try {
            // Get the FCM token instead of the native APNs token
            const result = await FCM.getToken()
            if (result.token) {
              resolve({ status: 'granted', token: result.token })
            } else {
              resolve({
                status: 'error',
                message: 'Native FCM token retrieved was empty.',
              })
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to retrieve native FCM token.'
            resolve({ status: 'error', message: msg })
          }
        })

        errorListener = await PushNotifications.addListener('registrationError', (error) => {
          if (registrationListener) registrationListener.remove()
          if (errorListener) errorListener.remove()
          resolve({
            status: 'error',
            message: error.error || 'Failed to register native push tokens.',
          })
        })

        // Backup safety timeout (12s)
        setTimeout(() => {
          if (registrationListener) registrationListener.remove()
          if (errorListener) errorListener.remove()
          resolve({
            status: 'error',
            message: 'APNs registration timed out. Please check your network connection.',
          })
        }, 12000)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to register mobile notifications.'
      return { status: 'error', message: msg }
    }
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return {
      status: 'unsupported',
      message: 'This browser does not support web push reminders.',
    }
  }

  if (!VAPID_KEY) {
    return {
      status: 'missing-vapid',
      message: 'Missing VITE_FIREBASE_VAPID_KEY. Generate a Web Push certificate in Firebase Cloud Messaging settings.',
    }
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    return {
      status: 'denied',
      message: 'Notifications are not enabled. Bujo will still show gentle in-app nudges.',
    }
  }

  try {
    const messaging = await getFirebaseMessaging()

    if (!messaging) {
      return {
        status: 'unsupported',
        message: 'Firebase messaging is not supported in this browser.',
      }
    }

    const registration = await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    if (!token) {
      return {
        status: 'error',
        message: 'Bujo could not create a notification token for this device.',
      }
    }

    return { status: 'granted', token }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to enable reminders right now.'
    return { status: 'error', message }
  }
}

export async function syncLocalNotifications(habits: { id: string; name: string; active: boolean; reminderEnabled: boolean; reminderTime: string }[]) {
  if (!Capacitor.isNativePlatform()) return

  try {
    // Check and request permissions
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions()
    }

    if (perm.display !== 'granted') {
      console.warn('Local notifications permission denied.')
      return
    }

    // Cancel all previously scheduled reminders to start clean
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }

    const activeReminders = habits.filter(h => h.active && h.reminderEnabled)
    if (activeReminders.length === 0) return

    const notifications = activeReminders.map(habit => {
      const [hourStr, minuteStr] = habit.reminderTime.split(':')
      const hour = parseInt(hourStr, 10) || 20
      const minute = parseInt(minuteStr, 10) || 0

      // Generate integer id from string habit.id
      let hash = 0
      for (let i = 0; i < habit.id.length; i++) {
        hash = habit.id.charCodeAt(i) + ((hash << 5) - hash)
      }
      const id = Math.abs(hash)

      return {
        id,
        title: 'Bujo Habit Reminder',
        body: `Time for ${habit.name}. A small check-in is waiting.`,
        schedule: {
          on: {
            hour,
            minute
          }
        },
        sound: 'default'
      }
    })

    await LocalNotifications.schedule({ notifications })
    console.log(`Successfully scheduled ${notifications.length} local notifications natively!`)
  } catch (err) {
    console.error('Error syncing local notifications:', err)
  }
}
