/// <reference lib="webworker" />

import { initializeApp } from 'firebase/app'
import { getMessaging, isSupported, onBackgroundMessage } from 'firebase/messaging/sw'
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

if (Object.values(firebaseConfig).every(Boolean)) {
  void isSupported().then((supported) => {
    if (!supported) return

    const app = initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    onBackgroundMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Bujo'
      const body = payload.notification?.body ?? 'A small check-in is waiting.'

      void self.registration.showNotification(title, {
        body,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: 'bujo-daily-reminder',
        data: payload.data,
      })
    })
  })
}
