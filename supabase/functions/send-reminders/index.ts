import { createClient } from 'npm:@supabase/supabase-js@2'
import { ApplicationServer, importVapidKeys, PushMessageError, Urgency } from 'jsr:@negrel/webpush@0.5.0'
import { expirySeconds, isPushEndpoint, localMinutes, noticeTarget, reminderAlertsAt, reminderText, remindersAt, type ReminderRow, type TaskRow } from './rules.ts'

// Called every minute by pg_cron (see the push_notifications migration). Sends each device the reminders now due.

const PAGE = 1000
const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10)

Deno.serve(async req => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Forbidden', { status: 403 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: devices, error } = await db.from('push_subscriptions').select('endpoint, user_id, p256dh, auth, time_zone')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!devices.length) return Response.json({ devices: 0, sent: 0 })

  // Any time zone's "today" falls within a day of the UTC date.
  const tasks: (TaskRow & { user_id: string })[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error: taskError } = await db.from('tasks').select('id, user_id, title, due, due_time')
      .eq('done', false).eq('deleted', false).not('due_time', 'is', null).gte('due', day(-1)).lte('due', day(2))
      .order('user_id').order('id').range(from, from + PAGE - 1)
    if (taskError) return Response.json({ error: taskError.message }, { status: 500 })
    tasks.push(...data)
    if (data.length < PAGE) break
  }

  // A week ahead for the earliest warning; repeating reminders started long ago, so their final day decides.
  const items: (ReminderRow & { user_id: string })[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error: reminderError } = await db.from('reminders').select('id, user_id, title, date, time, frequency, lead_time, end_date, done_until')
      .eq('deleted', false).is('done_at', null).lte('date', day(9)).or(`date.gte.${day(-1)},end_date.gte.${day(-1)}`)
      .order('user_id').order('id').range(from, from + PAGE - 1)
    if (reminderError) return Response.json({ error: reminderError.message }, { status: 500 })
    items.push(...data)
    if (data.length < PAGE) break
  }
  const { data: onlyReminders, error: profileError } = await db.from('profiles').select('user_id').eq('notify_tasks', false)
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 })
  const remindersOnly = new Set(onlyReminders.map(p => p.user_id))

  const server = await ApplicationServer.new({
    contactInformation: 'https://app.getsyncro.workers.dev',
    vapidKeys: await importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS')!)),
  })
  const now = new Date()
  let sent = 0, failed = 0

  for (const device of devices) {
    if (!isPushEndpoint(device.endpoint)) { await db.from('push_subscriptions').delete().eq('endpoint', device.endpoint); continue }
    let local: number
    try { local = localMinutes(now, device.time_zone) } catch { failed++; continue }
    const due = [
      ...(remindersOnly.has(device.user_id) ? [] : remindersAt(tasks.filter(t => t.user_id === device.user_id), local)),
      ...reminderAlertsAt(items.filter(r => r.user_id === device.user_id), local),
    ]
    if (!due.length) continue

    // Claims them first, so an overlapping run cannot send the same reminder twice.
    const rows = due.map(r => ({ endpoint: device.endpoint, task_id: r.taskId, kind: r.kind, due: r.due, due_time: r.time }))
    const { data: claimed, error: claimError } = await db.from('reminders_sent')
      .upsert(rows, { onConflict: 'endpoint,task_id,kind,due,due_time', ignoreDuplicates: true })
      .select('task_id, kind')
    if (claimError) { failed++; continue }
    const fresh = due.filter(r => claimed.some(c => c.task_id === r.taskId && c.kind === r.kind))
    if (!fresh.length) continue

    try {
      await server.subscribe({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } })
        .pushTextMessage(JSON.stringify({ ...reminderText(fresh), open: noticeTarget(fresh) }), { ttl: expirySeconds(fresh), urgency: Urgency.High })
      sent += fresh.length
    } catch (err) {
      failed++
      const status = err instanceof PushMessageError ? err.response.status : 0
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', device.endpoint)
      // Otherwise releases the claims so the next run tries again.
      else for (const r of fresh) await db.from('reminders_sent').delete().match({ endpoint: device.endpoint, task_id: r.taskId, kind: r.kind, due: r.due, due_time: r.time })
      console.error('push failed', status || err)
    }
  }

  if (now.getUTCMinutes() === 0) await db.from('reminders_sent').delete().lt('sent_at', new Date(Date.now() - 7 * 864e5).toISOString())
  return Response.json({ devices: devices.length, sent, failed })
})
