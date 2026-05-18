export interface ReminderDueInput {
  now?: Date
  reminderTime: string
  timezone: string
  lastSentDate?: string
  windowMinutes?: number
}

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 20 * 60
  }

  return hours * 60 + minutes
}

export function getLocalParts(date: Date, timezone: string) {
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
  const dateKey = `${value('year')}-${value('month')}-${value('day')}`
  const minutes = Number(value('hour')) * 60 + Number(value('minute'))

  return { dateKey, minutes }
}

export function isReminderDue({
  now = new Date(),
  reminderTime,
  timezone,
  lastSentDate,
  windowMinutes = 15,
}: ReminderDueInput) {
  const local = getLocalParts(now, timezone)

  if (lastSentDate === local.dateKey) {
    return false
  }

  const elapsed = local.minutes - timeToMinutes(reminderTime)
  return elapsed >= 0 && elapsed < windowMinutes
}
