import { desktop } from './desktop'
import { pull } from './sync/engine'
import { noticeTarget, reminderText, remindersBetween } from './reminders'
import { reminderAlertsBetween } from './reminderItems'
import { toStamp } from './dates'
import { readItem, writeItem } from './storage'
import { useStore } from '../store/useStore'

// Checks for reminders and task limits while the Windows host is running and asks it to show them.

const TARGET_KEY = 'syncro-notice-target'
/** The tab to open when a Windows notification is clicked: the host only reports the click, so the last one sent decides. */
export const noticeSection = () => readItem(TARGET_KEY) === 'lembretes' ? 'lembretes' as const : 'tarefas' as const

const CHECK_MS = 20 * 1000
/** After a longer gap (computer asleep, app just opened) other devices may have changed the tasks. */
const STALE_MS = 2 * 60 * 1000
const checkedKey = (userId: string) => `syncro-reminders-checked:${userId}`

function readChecked(key: string): Date | null {
  const raw = readItem(key), d = raw ? new Date(raw) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

let checking = false
async function check() {
  const { userId } = useStore.getState()
  if (checking || !desktop || !userId) return
  checking = true
  try {
    const key = checkedKey(userId), before = readChecked(key)
    if (before && Date.now() - before.getTime() > STALE_MS) await pull()
    const { data, notifications } = useStore.getState(), now = new Date()
    // The first check only starts the clock, and a clock moved backwards starts it again.
    const since = before && before <= now ? before : now
    // Time passes while notifications are off, so turning them back on does not bring old reminders.
    const due = notifications ? [...(data.notifyTasks ? remindersBetween(data.tasks, since, now) : []), ...reminderAlertsBetween(data.reminders, toStamp(since), toStamp(now))] : []
    writeItem(key, now.toISOString())
    if (due.length) {
      writeItem(TARGET_KEY, noticeTarget(due))
      desktop.postMessage('syncro:notify:' + JSON.stringify(reminderText(due)))
    }
  } finally { checking = false }
}

/** Starts the checks and returns the function that stops them. */
export function startReminders(): () => void {
  if (!desktop) return () => undefined
  void check()
  const timer = setInterval(() => void check(), CHECK_MS)
  return () => clearInterval(timer)
}
