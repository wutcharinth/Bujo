# Bujo

Bujo is an Apple-inspired mobile PWA for small daily and weekly habits, Google sign-in, streaks, an insight-focused progress dashboard, per-habit reminders, and optional habit timers.

## Local Setup

The app is already pointed at the Firebase project `bujobloom` in `.firebaserc` and `.env.local`.

```bash
npm install
npm --prefix functions install
npm run dev
```

Open the printed local URL on desktop or mobile. For iPhone push notifications, deploy over HTTPS, add Bujo to the Home Screen, then tap **Enable reminders** inside the app.

If Google sign-in is blocked inside an embedded browser, open Bujo in Chrome or Safari. Bujo uses the popup OAuth flow because redirect sign-in can fail in storage-partitioned browsers with a missing-state error.

## Firebase Setup

Enable these products in the Firebase console for `bujobloom`:

- Authentication: Google provider
- Firestore
- Cloud Messaging: Web Push certificate
- Functions and Hosting

Add the Web Push certificate public key to:

```bash
VITE_FIREBASE_VAPID_KEY=...
```

## Useful Commands

```bash
npm run test:run
npm run build
npm run functions:build
firebase deploy --only hosting,firestore,functions
```

## Data Shape

- `users/{uid}` stores the signed-in profile and timezone.
- `users/{uid}/habits/{habitId}` stores active and archived habits, daily/weekly cadence, per-habit reminder settings, and optional timer durations.
- `users/{uid}/checkins/{date_habitId}` stores daily habit completions.
- `users/{uid}/notificationPrefs/main` stores the device reminder master switch and timezone.
- `users/{uid}/fcmTokens/{token}` stores device tokens for Firebase Cloud Messaging.
