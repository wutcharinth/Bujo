import { useCallback, useEffect, useState } from 'react'
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as signOutFromFirebase,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, hasFirebaseConfig } from '../lib/firebase'
import { getUserTimeZone } from '../lib/reminders'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: hasFirebaseConfig,
    error: hasFirebaseConfig ? null : 'Firebase is not configured yet.',
  })

  useEffect(() => {
    if (!auth) {
      return
    }

    return onAuthStateChanged(
      auth,
      async (user) => {
        setState({ user, loading: false, error: null })

        if (user && db) {
          const userRef = doc(db, 'users', user.uid)
          const userSnapshot = await getDoc(userRef)

          await setDoc(
            userRef,
            {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              timezone: getUserTimeZone(),
              updatedAt: serverTimestamp(),
              ...(!userSnapshot.exists() ? { createdAt: serverTimestamp() } : {}),
            },
            { merge: true },
          )
        }
      },
      (error) => {
        setState({ user: null, loading: false, error: error.message })
      },
    )
  }, [])

  const signIn = useCallback(async () => {
    if (!auth) {
      setState((current) => ({ ...current, error: 'Firebase is not configured yet.' }))
      return
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      await setPersistence(auth, browserLocalPersistence)
      await signInWithPopup(auth, provider)
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
      const fallbackMessage =
        code === 'auth/popup-blocked'
          ? 'This browser blocked the Google sign-in popup. Open Bujo in Chrome or Safari, or allow popups for this site.'
          : code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
            ? 'Google sign-in was closed before it finished.'
            : code === 'auth/unauthorized-domain'
              ? 'This domain is not allowed in Firebase Auth yet. Add localhost and your deployed Bujo domain in Firebase Authentication settings.'
              : error instanceof Error
                ? error.message
                : 'Unable to sign in with Google.'

      setState((current) => ({
        ...current,
        error: fallbackMessage,
      }))
    }
  }, [])

  const signOut = useCallback(async () => {
    if (auth) {
      await signOutFromFirebase(auth)
    }
  }, [])

  return { ...state, signIn, signOut, hasFirebaseConfig }
}
