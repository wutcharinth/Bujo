import { getToken } from 'firebase/messaging'
import { getFirebaseMessaging } from './firebase'

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
