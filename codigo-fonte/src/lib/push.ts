import { desktop } from './desktop'
import { supabase } from './supabase'

// Web Push on the web/PWA build. The Windows app checks reminders by itself (lib/notifications.ts).

/** Public by design: browsers use it to accept messages only from the Syncro server. */
const VAPID_PUBLIC_KEY = 'BN7N66Wrz2McOMxQ055bM6gDS_ly_dJehmaXLqbYbQ9F3Ljk5K6OmwBOPOtLEP75cRyEZYv2vnvWE_x1rJ63eq4'

export type PushState = 'unsupported' | 'install' | 'denied' | 'off' | 'on'

const supported = () => !desktop && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? { registration, subscription: await registration.pushManager.getSubscription() } : null
}

function keyBytes(key: string) {
  const text = atob(key.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(text, c => c.charCodeAt(0))
}

async function save(subscription: PushSubscription) {
  const keys = subscription.toJSON().keys
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint, p_p256dh: keys?.p256dh, p_auth: keys?.auth,
    p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  if (error) throw error
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return !desktop && /iP(hone|ad|od)/.test(navigator.userAgent) ? 'install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const current = await currentSubscription()
  if (!current) return 'unsupported'
  return current.subscription ? 'on' : 'off'
}

/** Asks for permission and registers this device. Refusing the permission is not an error. */
export async function enablePush() {
  if (await Notification.requestPermission() !== 'granted') return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
  try { await save(subscription) } catch (error) {
    // The switch must not look on when the server does not know this device.
    await subscription.unsubscribe()
    throw error
  }
}

/** Stops this device's reminders. Should the row remain, the server removes it when the push service reports it gone. */
export async function disablePush() {
  if (!supported()) return
  const subscription = (await currentSubscription())?.subscription
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}

/** Keeps the server up to date with this device's time zone and subscription each time the app opens. */
export async function refreshPush() {
  if (!supported()) return
  const subscription = (await currentSubscription())?.subscription
  if (subscription) await save(subscription).catch(() => undefined)
}

/** The tab to open when the app was started by tapping a notification; clears the mark so a reload starts normally. */
export function takeOpenRequest() {
  const url = new URL(location.href), target = url.searchParams.get('abrir')
  if (target !== 'tarefas' && target !== 'lembretes') return null
  url.searchParams.delete('abrir')
  history.replaceState(null, '', url)
  return target
}
