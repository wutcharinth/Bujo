import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDateKey } from '../lib/dates'
import { shapeHabitActivityEvent, uniqueUids } from '../lib/social'
import type {
  ActivityEvent,
  ActivityEventType,
  ActivityVisibility,
  Cheer,
  CheerType,
  Circle,
  CircleInvite,
  CircleMember,
  FriendProfile,
  Habit,
  Nudge,
  SocialInboxItem,
} from '../types'

interface SyncProfileStats {
  streak: number
  habitsCount: number
  todayProgress: number
  weeklyProgress: number
  sharedHabitCount: number
  lastMilestone?: string
}

interface HabitPublishStats {
  completedCount: number
  totalHabits: number
  currentStreak: number
  todayProgress: number
  weeklyProgress: number
}

function generateFriendCode(uid: string): string {
  const raw = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
  return raw.padEnd(6, 'X')
}

function generateCircleCode(seed: string): string {
  const raw = seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'B')
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${raw}${suffix}`
}

function clampPercent(value: number) {
  const normalized = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(100, Math.round(normalized || 0)))
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

function mapProfile(id: string, data: Record<string, unknown>): FriendProfile {
  return {
    uid: typeof data.uid === 'string' ? data.uid : id,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Bujo friend',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
    friendCode: typeof data.friendCode === 'string' ? data.friendCode : generateFriendCode(id),
    streak: typeof data.streak === 'number' ? data.streak : 0,
    habitsCount: typeof data.habitsCount === 'number' ? data.habitsCount : 0,
    todayProgress: typeof data.todayProgress === 'number' ? data.todayProgress : 0,
    weeklyProgress: typeof data.weeklyProgress === 'number' ? data.weeklyProgress : 0,
    sharedHabitCount: typeof data.sharedHabitCount === 'number' ? data.sharedHabitCount : 0,
    lastMilestone: typeof data.lastMilestone === 'string' ? data.lastMilestone : undefined,
    lastActive: typeof data.lastActive === 'string' ? data.lastActive : '',
    cheersToday: typeof data.cheersToday === 'number' ? data.cheersToday : 0,
    isPublic: data.isPublic !== false,
    circleIds: Array.isArray(data.circleIds) ? data.circleIds.filter((item): item is string => typeof item === 'string') : [],
  }
}

function mapCheer(id: string, data: Record<string, unknown>): Cheer {
  const cheerType: CheerType = data.type === 'clap' || data.type === 'fire' || data.type === 'crown' ? data.type : 'spark'

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
}

function mapActivityEvent(id: string, data: Record<string, unknown>): ActivityEvent {
  const type: ActivityEventType =
    data.type === 'milestone' ||
    data.type === 'streak' ||
    data.type === 'cheer' ||
    data.type === 'nudge' ||
    data.type === 'circle-progress'
      ? data.type
      : 'checkin'
  const visibility: ActivityVisibility =
    data.visibility === 'self' || data.visibility === 'circles' ? data.visibility : 'friends'

  return {
    id,
    type,
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : '',
    actorName: typeof data.actorName === 'string' ? data.actorName : 'A friend',
    actorPhotoURL: typeof data.actorPhotoURL === 'string' ? data.actorPhotoURL : undefined,
    targetUid: typeof data.targetUid === 'string' ? data.targetUid : undefined,
    circleId: typeof data.circleId === 'string' ? data.circleId : undefined,
    circleName: typeof data.circleName === 'string' ? data.circleName : undefined,
    habitId: typeof data.habitId === 'string' ? data.habitId : undefined,
    habitName: typeof data.habitName === 'string' ? data.habitName : undefined,
    habitIcon: typeof data.habitIcon === 'string' ? (data.habitIcon as ActivityEvent['habitIcon']) : undefined,
    habitColor: typeof data.habitColor === 'string' ? (data.habitColor as ActivityEvent['habitColor']) : undefined,
    visibility,
    viewerUids: Array.isArray(data.viewerUids) ? data.viewerUids.filter((item): item is string => typeof item === 'string') : [],
    circleMemberUids: Array.isArray(data.circleMemberUids)
      ? data.circleMemberUids.filter((item): item is string => typeof item === 'string')
      : undefined,
    date: typeof data.date === 'string' ? data.date : getDateKey(),
    summary: typeof data.summary === 'string' ? data.summary : 'A friend checked in',
    detail: typeof data.detail === 'string' ? data.detail : undefined,
    createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : 0,
    createdAt: data.createdAt,
  }
}

function mapCircleMember(id: string, data: Record<string, unknown>): CircleMember {
  return {
    id,
    uid: typeof data.uid === 'string' ? data.uid : id,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Member',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
    role: data.role === 'owner' ? 'owner' : 'member',
    weeklyProgress: typeof data.weeklyProgress === 'number' ? data.weeklyProgress : 0,
    todayProgress: typeof data.todayProgress === 'number' ? data.todayProgress : 0,
    joinedAt: data.joinedAt,
    updatedAt: data.updatedAt,
  }
}

function mapCircle(id: string, data: Record<string, unknown>, members: CircleMember[] = []): Circle {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Accountability circle',
    inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : '',
    ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
    memberUids: Array.isArray(data.memberUids) ? data.memberUids.filter((item): item is string => typeof item === 'string') : [],
    weeklyGoal: typeof data.weeklyGoal === 'number' ? data.weeklyGoal : 70,
    members,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapInboxItem(id: string, data: Record<string, unknown>): SocialInboxItem {
  const type =
    data.type === 'nudge' || data.type === 'circle-invite' || data.type === 'weekly-summary' ? data.type : 'cheer'

  return {
    id,
    ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : '',
    actorName: typeof data.actorName === 'string' ? data.actorName : 'A friend',
    type,
    title: typeof data.title === 'string' ? data.title : 'Social update',
    body: typeof data.body === 'string' ? data.body : '',
    read: data.read === true,
    createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : 0,
    createdAt: data.createdAt,
  }
}

export function useFriends(user: User | null) {
  const [myProfile, setMyProfile] = useState<FriendProfile | null>(null)
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [cheersSent, setCheersSent] = useState<Cheer[]>([])
  const [cheersReceived, setCheersReceived] = useState<Cheer[]>([])
  const [cheersSentToday, setCheersSentToday] = useState<Set<string>>(new Set())
  const [cheersReceivedToday, setCheersReceivedToday] = useState(0)
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [inboxItems, setInboxItems] = useState<SocialInboxItem[]>([])

  const unreadCount = useMemo(() => inboxItems.filter((item) => !item.read).length, [inboxItems])

  const writeInboxItem = useCallback(
    async (ownerUid: string, item: Omit<SocialInboxItem, 'id' | 'createdAt'>) => {
      if (!db) return
      const itemRef = doc(collection(db, 'users', ownerUid, 'socialInbox'))
      await setDoc(itemRef, {
        ...item,
        createdAt: serverTimestamp(),
      })
    },
    [],
  )

  const getFollowerUids = useCallback(async () => {
    if (!user || !db) return []
    const followersQuery = query(collection(db, 'follows'), where('followedUid', '==', user.uid))
    const followerDocs = await getDocs(followersQuery)
    return followerDocs.docs
      .map((item) => item.data().followerUid)
      .filter((uid): uid is string => typeof uid === 'string')
  }, [user])

  const syncMyProfile = useCallback(
    async (stats: SyncProfileStats) => {
      if (!user || !db) return

      const todayProgress = clampPercent(stats.todayProgress)
      const weeklyProgress = clampPercent(stats.weeklyProgress)
      const circleIds = circles.map((circle) => circle.id)
      const friendCode = generateFriendCode(user.uid)
      const profile: Omit<FriendProfile, 'uid'> = {
        displayName: user.displayName || 'Bujo User',
        photoURL: user.photoURL || '',
        friendCode,
        streak: stats.streak,
        habitsCount: stats.habitsCount,
        todayProgress,
        weeklyProgress,
        sharedHabitCount: stats.sharedHabitCount,
        lastMilestone: stats.lastMilestone,
        lastActive: getDateKey(),
        circleIds,
      }

      await setDoc(
        doc(db, 'profiles', user.uid),
        withoutUndefined({
          ...profile,
          uid: user.uid,
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      )

      await Promise.all(
        circles.map((circle) =>
          setDoc(
            doc(db!, 'circles', circle.id, 'members', user.uid),
            withoutUndefined({
              uid: user.uid,
              displayName: profile.displayName,
              photoURL: profile.photoURL,
              role: circle.ownerUid === user.uid ? 'owner' : 'member',
              todayProgress,
              weeklyProgress,
              updatedAt: serverTimestamp(),
            }),
            { merge: true },
          ),
        ),
      )

      setMyProfile((previous) => ({ ...(previous ?? {}), ...profile, uid: user.uid }))
    },
    [circles, user],
  )

  useEffect(() => {
    if (!user || !db) return

    const firestore = db
    const today = getDateKey()
    let friendUnsubscribers: Array<() => void> = []
    let circleMemberUnsubscribers: Array<() => void> = []

    const stopFriendListeners = () => {
      friendUnsubscribers.forEach((unsubscribeFriend) => unsubscribeFriend())
      friendUnsubscribers = []
    }

    const stopCircleMemberListeners = () => {
      circleMemberUnsubscribers.forEach((unsubscribeCircleMembers) => unsubscribeCircleMembers())
      circleMemberUnsubscribers = []
    }

    const unsubProfile = onSnapshot(doc(firestore, 'profiles', user.uid), (snap) => {
      if (snap.exists()) {
        setMyProfile(mapProfile(snap.id, snap.data()))
      }
    })

    const sentCheersQuery = query(
      collection(firestore, 'cheers'),
      where('fromUid', '==', user.uid),
      where('date', '==', today),
    )
    const unsubSentCheers = onSnapshot(sentCheersQuery, (snapshot) => {
      const sentCheers = snapshot.docs.map((item) => mapCheer(item.id, item.data()))
      setCheersSent(sentCheers)
      setCheersSentToday(new Set(sentCheers.map((cheer) => cheer.toUid)))
    })

    const receivedCheersQuery = query(
      collection(firestore, 'cheers'),
      where('toUid', '==', user.uid),
      where('date', '==', today),
    )
    const unsubReceivedCheers = onSnapshot(receivedCheersQuery, (snapshot) => {
      setCheersReceived(snapshot.docs.map((item) => mapCheer(item.id, item.data())))
      setCheersReceivedToday(snapshot.size)
    })

    const followQuery = query(collection(firestore, 'follows'), where('followerUid', '==', user.uid))
    const unsubscribeFollows = onSnapshot(followQuery, (snapshot) => {
      stopFriendListeners()
      setLoading(true)
      const followedUids = snapshot.docs
        .map((item) => item.data().followedUid)
        .filter((uid): uid is string => typeof uid === 'string')

      if (followedUids.length === 0) {
        setFriends([])
        setLoading(false)
        return
      }

      const profileMap = new Map<string, FriendProfile>()
      const cheerCountMap = new Map<string, number>()
      const pendingProfiles = new Set(followedUids)

      const publishFriends = () => {
        setFriends(
          followedUids.flatMap((uid) => {
            const profile = profileMap.get(uid)
            if (!profile) return []

            return [{
              ...profile,
              uid: profile.uid || uid,
              cheersToday: cheerCountMap.get(uid) ?? profile.cheersToday ?? 0,
            }]
          }),
        )

        if (pendingProfiles.size === 0) {
          setLoading(false)
        }
      }

      followedUids.forEach((uid) => {
        const profileUnsubscribe = onSnapshot(
          doc(firestore, 'profiles', uid),
          (profileSnap) => {
            pendingProfiles.delete(uid)
            if (profileSnap.exists()) {
              profileMap.set(uid, mapProfile(profileSnap.id, profileSnap.data()))
            } else {
              profileMap.delete(uid)
            }
            publishFriends()
          },
          () => {
            pendingProfiles.delete(uid)
            profileMap.delete(uid)
            publishFriends()
          },
        )

        const cheerQuery = query(
          collection(firestore, 'cheers'),
          where('toUid', '==', uid),
          where('date', '==', today),
        )
        const cheerUnsubscribe = onSnapshot(
          cheerQuery,
          (cheerSnap) => {
            cheerCountMap.set(uid, cheerSnap.size)
            publishFriends()
          },
          () => {
            cheerCountMap.set(uid, 0)
            publishFriends()
          },
        )

        friendUnsubscribers.push(profileUnsubscribe, cheerUnsubscribe)
      })
    })

    const activityQuery = query(collection(firestore, 'activityEvents'), where('viewerUids', 'array-contains', user.uid))
    const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
      setActivityEvents(
        snapshot.docs
          .map((item) => mapActivityEvent(item.id, item.data()))
          .sort((first, second) => second.createdAtMs - first.createdAtMs)
          .slice(0, 40),
      )
    })

    const circlesQuery = query(collection(firestore, 'circles'), where('memberUids', 'array-contains', user.uid))
    const unsubCircles = onSnapshot(circlesQuery, (snapshot) => {
      stopCircleMemberListeners()
      const baseCircles = snapshot.docs.map((item) => mapCircle(item.id, item.data()))
      setCircles(baseCircles)

      baseCircles.forEach((circle) => {
        const membersUnsubscribe = onSnapshot(collection(firestore, 'circles', circle.id, 'members'), (memberSnap) => {
          const members = memberSnap.docs
            .map((item) => mapCircleMember(item.id, item.data()))
            .sort((first, second) => {
              if (first.role !== second.role) return first.role === 'owner' ? -1 : 1
              return second.weeklyProgress - first.weeklyProgress
            })

          setCircles((current) =>
            current.map((candidate) => (candidate.id === circle.id ? { ...candidate, members } : candidate)),
          )
        })

        circleMemberUnsubscribers.push(membersUnsubscribe)
      })
    })

    const inboxQuery = query(collection(firestore, 'users', user.uid, 'socialInbox'), orderBy('createdAtMs', 'desc'))
    const unsubInbox = onSnapshot(inboxQuery, (snapshot) => {
      setInboxItems(snapshot.docs.map((item) => mapInboxItem(item.id, item.data())).slice(0, 30))
    })

    return () => {
      unsubProfile()
      unsubSentCheers()
      unsubReceivedCheers()
      unsubscribeFollows()
      unsubActivity()
      unsubCircles()
      unsubInbox()
      stopFriendListeners()
      stopCircleMemberListeners()
    }
  }, [user])

  const sendCheer = useCallback(
    async (targetUid: string, type: CheerType = 'spark') => {
      if (!user || !db) return
      const today = getDateKey()
      const cheerId = `${user.uid}_${targetUid}_${today}`
      const cheerRef = doc(db, 'cheers', cheerId)
      const existingCheer = await getDoc(cheerRef)
      if (existingCheer.exists()) return

      const targetProfile = friends.find((friend) => friend.uid === targetUid)
      const fromName = user.displayName || 'A friend'
      await setDoc(cheerRef, {
        fromUid: user.uid,
        toUid: targetUid,
        fromName,
        toName: targetProfile?.displayName ?? '',
        type,
        date: today,
        createdAt: serverTimestamp(),
      })

      const eventId = `cheer_${cheerId}`
      await setDoc(doc(db, 'activityEvents', eventId), {
        ...withoutUndefined({
        id: eventId,
        type: 'cheer',
        actorUid: user.uid,
        actorName: fromName,
        actorPhotoURL: user.photoURL || '',
        targetUid,
        visibility: 'friends',
        viewerUids: uniqueUids([user.uid, targetUid]),
        date: today,
        summary: `${fromName} sent a cheer`,
        detail: targetProfile ? `For ${targetProfile.displayName}` : 'A small boost',
        createdAtMs: Date.now(),
        }),
        createdAt: serverTimestamp(),
      })

      await writeInboxItem(targetUid, {
        ownerUid: targetUid,
        actorUid: user.uid,
        actorName: fromName,
        type: 'cheer',
        title: 'New cheer',
        body: `${fromName} sent you a little boost.`,
        read: false,
        createdAtMs: Date.now(),
      })

      setCheersSentToday((previous) => new Set(previous).add(targetUid))
    },
    [friends, user, writeInboxItem],
  )

  const sendNudge = useCallback(
    async (targetUid: string, message = 'A tiny check-in is waiting.') => {
      if (!user || !db) return
      const today = getDateKey()
      const nudgeId = `${user.uid}_${targetUid}_${today}`
      const targetProfile = friends.find((friend) => friend.uid === targetUid)
      const fromName = user.displayName || 'A friend'
      const nudge: Omit<Nudge, 'createdAt'> = {
        id: nudgeId,
        fromUid: user.uid,
        toUid: targetUid,
        fromName,
        toName: targetProfile?.displayName,
        message,
        type: 'gentle',
        date: today,
        createdAtMs: Date.now(),
      }

      await setDoc(doc(db, 'nudges', nudgeId), {
        ...withoutUndefined(nudge),
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'activityEvents', `nudge_${nudgeId}`), {
        ...withoutUndefined({
        id: `nudge_${nudgeId}`,
        type: 'nudge',
        actorUid: user.uid,
        actorName: fromName,
        actorPhotoURL: user.photoURL || '',
        targetUid,
        visibility: 'friends',
        viewerUids: uniqueUids([user.uid, targetUid]),
        date: today,
        summary: `${fromName} sent a nudge`,
        detail: message,
        createdAtMs: Date.now(),
        }),
        createdAt: serverTimestamp(),
      })
      await writeInboxItem(targetUid, {
        ownerUid: targetUid,
        actorUid: user.uid,
        actorName: fromName,
        type: 'nudge',
        title: 'Gentle nudge',
        body: message,
        read: false,
        createdAtMs: Date.now(),
      })
    },
    [friends, user, writeInboxItem],
  )

  const publishHabitActivity = useCallback(
    async (habit: Habit, stats: HabitPublishStats) => {
      if (!user || !db) return

      const today = getDateKey()
      const actorName = user.displayName || 'A friend'
      const followers = await getFollowerUids()
      const now = Date.now()

      if (habit.shareLevel === 'circles') {
        const selectedCircles = circles.filter((circle) => habit.sharedCircleIds.includes(circle.id))
        await Promise.all(
          selectedCircles.map((circle) => {
            const event = shapeHabitActivityEvent({
              id: `habit_${user.uid}_${habit.id}_${today}_${circle.id}`,
              actorUid: user.uid,
              actorName,
              actorPhotoURL: user.photoURL || '',
              habit,
              date: today,
              completedCount: stats.completedCount,
              totalHabits: stats.totalHabits,
              visibility: 'circles',
              viewerUids: uniqueUids([...circle.memberUids, user.uid]),
              circleId: circle.id,
              circleName: circle.name,
              circleMemberUids: circle.memberUids,
              createdAtMs: now,
            })

            return setDoc(doc(db!, 'activityEvents', event.id), {
              ...withoutUndefined(event),
              createdAt: serverTimestamp(),
            })
          }),
        )
        return
      }

      const event = shapeHabitActivityEvent({
        id: `habit_${user.uid}_${habit.id}_${today}`,
        actorUid: user.uid,
        actorName,
        actorPhotoURL: user.photoURL || '',
        habit,
        date: today,
        completedCount: stats.completedCount,
        totalHabits: stats.totalHabits,
        visibility: followers.length ? 'friends' : 'self',
        viewerUids: uniqueUids([user.uid, ...followers]),
        createdAtMs: now,
      })

      await setDoc(doc(db, 'activityEvents', event.id), {
        ...withoutUndefined(event),
        detail: `${event.detail} · ${clampPercent(stats.weeklyProgress)}% this week · ${stats.currentStreak}d streak`,
        createdAt: serverTimestamp(),
      })
    },
    [circles, getFollowerUids, user],
  )

  const followByCode = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!user || !db) return { success: false, message: 'Not signed in.' }

      const trimmed = code.trim().toUpperCase()
      if (trimmed.length < 4) return { success: false, message: 'Friend code too short.' }

      const profileQuery = query(collection(db, 'profiles'), where('friendCode', '==', trimmed))
      const results = await getDocs(profileQuery)
      if (results.empty) return { success: false, message: 'No user found with that code.' }

      const targetProfile = mapProfile(results.docs[0].id, results.docs[0].data())
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

  const unfollow = useCallback(
    async (targetUid: string) => {
      if (!user || !db) return
      await deleteDoc(doc(db, 'follows', `${user.uid}_${targetUid}`))
    },
    [user],
  )

  const togglePrivacy = useCallback(
    async (isPublic: boolean) => {
      if (!user || !db) return
      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          isPublic,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setMyProfile((prev) => (prev ? { ...prev, isPublic } : prev))
    },
    [user],
  )

  const createCircle = useCallback(
    async (name: string, weeklyGoal: number): Promise<{ success: boolean; message: string }> => {
      if (!user || !db) return { success: false, message: 'Not signed in.' }
      const cleanName = name.trim()
      if (cleanName.length < 2) return { success: false, message: 'Give the circle a short name.' }

      const circleRef = doc(collection(db, 'circles'))
      const inviteCode = generateCircleCode(circleRef.id)
      const ownerName = user.displayName || 'Bujo User'
      const goal = Math.max(10, Math.min(100, Math.round(weeklyGoal || 70)))

      await setDoc(circleRef, {
        name: cleanName,
        inviteCode,
        ownerUid: user.uid,
        memberUids: [user.uid],
        weeklyGoal: goal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'circles', circleRef.id, 'members', user.uid), {
        uid: user.uid,
        displayName: ownerName,
        photoURL: user.photoURL || '',
        role: 'owner',
        todayProgress: myProfile?.todayProgress ?? 0,
        weeklyProgress: myProfile?.weeklyProgress ?? 0,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const invite: Omit<CircleInvite, 'createdAt'> = {
        id: inviteCode,
        code: inviteCode,
        circleId: circleRef.id,
        circleName: cleanName,
        ownerUid: user.uid,
        active: true,
      }
      await setDoc(doc(db, 'circleInvites', inviteCode), {
        ...invite,
        createdAt: serverTimestamp(),
      })

      return { success: true, message: `${cleanName} created. Invite code ${inviteCode}.` }
    },
    [myProfile?.todayProgress, myProfile?.weeklyProgress, user],
  )

  const joinCircleByCode = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!user || !db) return { success: false, message: 'Not signed in.' }
      const trimmed = code.trim().toUpperCase()
      if (trimmed.length < 4) return { success: false, message: 'Circle code too short.' }

      const inviteSnap = await getDoc(doc(db, 'circleInvites', trimmed))
      if (!inviteSnap.exists()) return { success: false, message: 'No circle found with that code.' }
      const invite = inviteSnap.data() as Omit<CircleInvite, 'id'>
      if (invite.active === false) return { success: false, message: 'That invite is no longer active.' }

      const circleRef = doc(db, 'circles', invite.circleId)
      const circleSnap = await getDoc(circleRef)
      if (!circleSnap.exists()) return { success: false, message: 'That circle no longer exists.' }
      const circle = mapCircle(circleSnap.id, circleSnap.data())
      if (circle.memberUids.includes(user.uid)) return { success: true, message: `You are already in ${circle.name}.` }

      await updateDoc(circleRef, {
        memberUids: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'circles', circle.id, 'members', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'Bujo User',
        photoURL: user.photoURL || '',
        role: 'member',
        todayProgress: myProfile?.todayProgress ?? 0,
        weeklyProgress: myProfile?.weeklyProgress ?? 0,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return { success: true, message: `Joined ${circle.name}.` }
    },
    [myProfile?.todayProgress, myProfile?.weeklyProgress, user],
  )

  const leaveCircle = useCallback(
    async (circleId: string) => {
      if (!user || !db) return
      await updateDoc(doc(db, 'circles', circleId), {
        memberUids: arrayRemove(user.uid),
        updatedAt: serverTimestamp(),
      })
      await deleteDoc(doc(db, 'circles', circleId, 'members', user.uid))
    },
    [user],
  )

  const markInboxItemRead = useCallback(
    async (itemId: string) => {
      if (!user || !db) return
      await updateDoc(doc(db, 'users', user.uid, 'socialInbox', itemId), {
        read: true,
        readAt: serverTimestamp(),
      })
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
    activityEvents,
    circles,
    inboxItems,
    unreadCount,
    syncMyProfile,
    sendCheer,
    sendNudge,
    publishHabitActivity,
    followByCode,
    unfollow,
    togglePrivacy,
    createCircle,
    joinCircleByCode,
    leaveCircle,
    markInboxItemRead,
  }
}
