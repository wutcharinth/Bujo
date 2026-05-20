import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDateKey } from '../lib/dates'
import type { Cheer, CheerType, FriendProfile } from '../types'

function generateFriendCode(uid: string): string {
  const raw = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
  return raw.padEnd(6, 'X')
}

export function useFriends(user: User | null) {
  const [myProfile, setMyProfile] = useState<FriendProfile | null>(null)
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [cheersSent, setCheersSent] = useState<Cheer[]>([])
  const [cheersReceived, setCheersReceived] = useState<Cheer[]>([])
  const [cheersSentToday, setCheersSentToday] = useState<Set<string>>(new Set())
  const [cheersReceivedToday, setCheersReceivedToday] = useState(0)

  const mapCheer = useCallback((id: string, data: Record<string, unknown>): Cheer => {
    const cheerType = data.type === 'clap' || data.type === 'fire' || data.type === 'crown' ? data.type : 'spark'

    return {
      id,
      fromUid: typeof data.fromUid === 'string' ? data.fromUid : '',
      toUid: typeof data.toUid === 'string' ? data.toUid : '',
      fromName: typeof data.fromName === 'string' ? data.fromName : 'A friend',
      toName: typeof data.toName === 'string' ? data.toName : undefined,
      type: cheerType,
      date: typeof data.date === 'string' ? data.date : getDateKey(),
      createdAt: data.createdAt,
    }
  }, [])

  // Sync own public profile to /profiles/{uid}
  const syncMyProfile = useCallback(
    async (streak: number, habitsCount: number, todayProgress: number) => {
      if (!user || !db) return

      const friendCode = generateFriendCode(user.uid)
      const profile: Omit<FriendProfile, 'uid'> = {
        displayName: user.displayName || 'Bujo User',
        photoURL: user.photoURL || '',
        friendCode,
        streak,
        habitsCount,
        todayProgress: Math.round(todayProgress * 100),
        lastActive: getDateKey(),
      }

      await setDoc(doc(db, 'profiles', user.uid), {
        ...profile,
        uid: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      setMyProfile({ ...profile, uid: user.uid })
    },
    [user],
  )

  // Listen to my follow documents + cheers
  useEffect(() => {
    if (!user || !db) return

    const firestore = db
    const today = getDateKey()

    // Load my own profile
    getDoc(doc(firestore, 'profiles', user.uid)).then((snap) => {
      if (snap.exists()) {
        setMyProfile(snap.data() as FriendProfile)
      }
    })

    // Listen to cheers I've sent today
    const sentCheersQuery = query(
      collection(firestore, 'cheers'),
      where('fromUid', '==', user.uid),
      where('date', '==', today),
    )
    const unsubSentCheers = onSnapshot(sentCheersQuery, (snapshot) => {
      const sentCheers = snapshot.docs.map((d) => mapCheer(d.id, d.data()))
      const sent = new Set<string>()
      sentCheers.forEach((cheer) => sent.add(cheer.toUid))
      setCheersSent(sentCheers)
      setCheersSentToday(sent)
    })

    // Listen to cheers I've received today
    const receivedCheersQuery = query(
      collection(firestore, 'cheers'),
      where('toUid', '==', user.uid),
      where('date', '==', today),
    )
    const unsubReceivedCheers = onSnapshot(receivedCheersQuery, (snapshot) => {
      setCheersReceived(snapshot.docs.map((d) => mapCheer(d.id, d.data())))
      setCheersReceivedToday(snapshot.size)
    })

    // Subscribe to follow relationships where I am the follower
    const followQuery = query(
      collection(firestore, 'follows'),
      where('followerUid', '==', user.uid),
    )

    const unsubscribe = onSnapshot(followQuery, async (snapshot) => {
      setLoading(true)
      const followedUids = snapshot.docs.map((d) => d.data().followedUid as string)

      if (followedUids.length === 0) {
        setFriends([])
        setLoading(false)
        return
      }

      // Fetch profiles + cheers count for all followed users
      const profiles: FriendProfile[] = []
      for (const uid of followedUids) {
        try {
          const profileSnap = await getDoc(doc(firestore, 'profiles', uid))
          if (profileSnap.exists()) {
            const profile = profileSnap.data() as FriendProfile
            // Count cheers this friend received today
            const cheerQuery = query(
              collection(firestore, 'cheers'),
              where('toUid', '==', uid),
              where('date', '==', today),
            )
            const cheerSnap = await getDocs(cheerQuery)
            profile.cheersToday = cheerSnap.size
            profiles.push(profile)
          }
        } catch {
          // Silently skip failed profile loads
        }
      }
      setFriends(profiles)
      setLoading(false)
    })

    return () => {
      unsubscribe()
      unsubSentCheers()
      unsubReceivedCheers()
    }
  }, [mapCheer, user])

  // Send a cheer to a friend
  const sendCheer = useCallback(
    async (targetUid: string, type: CheerType = 'spark') => {
      if (!user || !db) return
      const today = getDateKey()
      const cheerId = `${user.uid}_${targetUid}_${today}`
      const cheerRef = doc(db, 'cheers', cheerId)
      const existingCheer = await getDoc(cheerRef)
      if (existingCheer.exists()) return

      const targetProfile = friends.find((friend) => friend.uid === targetUid)
      await setDoc(cheerRef, {
        fromUid: user.uid,
        toUid: targetUid,
        fromName: user.displayName || 'A friend',
        toName: targetProfile?.displayName ?? '',
        type,
        date: today,
        createdAt: serverTimestamp(),
      })
      setCheersSentToday((previous) => new Set(previous).add(targetUid))
    },
    [friends, user],
  )

  // Follow a user by friend code
  const followByCode = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!user || !db) return { success: false, message: 'Not signed in.' }

      const trimmed = code.trim().toUpperCase()
      if (trimmed.length < 4) return { success: false, message: 'Friend code too short.' }

      const profileQuery = query(
        collection(db, 'profiles'),
        where('friendCode', '==', trimmed),
      )
      const results = await getDocs(profileQuery)

      if (results.empty) return { success: false, message: 'No user found with that code.' }

      const targetProfile = results.docs[0].data() as FriendProfile
      if (targetProfile.uid === user.uid) return { success: false, message: "That's your own code!" }

      const followDocId = `${user.uid}_${targetProfile.uid}`
      const existingFollow = await getDoc(doc(db, 'follows', followDocId))
      if (existingFollow.exists()) return { success: false, message: 'Already following this user.' }

      await setDoc(doc(db, 'follows', followDocId), {
        followerUid: user.uid,
        followedUid: targetProfile.uid,
        createdAt: serverTimestamp(),
      })

      return { success: true, message: `Now following ${targetProfile.displayName}!` }
    },
    [user],
  )

  // Unfollow a user
  const unfollow = useCallback(
    async (targetUid: string) => {
      if (!user || !db) return
      const followDocId = `${user.uid}_${targetUid}`
      await deleteDoc(doc(db, 'follows', followDocId))
    },
    [user],
  )

  // Toggle public/private profile visibility
  const togglePrivacy = useCallback(
    async (isPublic: boolean) => {
      if (!user || !db) return
      await setDoc(doc(db, 'profiles', user.uid), {
        isPublic,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMyProfile((prev) => prev ? { ...prev, isPublic } : prev)
    },
    [user],
  )

  return {
    myProfile,
    friends,
    loading,
    cheersSent,
    cheersReceived,
    cheersSentToday,
    cheersReceivedToday,
    syncMyProfile,
    sendCheer,
    followByCode,
    unfollow,
    togglePrivacy,
  }
}
