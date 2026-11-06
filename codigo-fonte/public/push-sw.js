// Loaded by the generated service worker (workbox importScripts in vite.config.ts): shows reminders and opens the right tab on tap.

self.addEventListener('push', event => {
  let notice = {}
  try { notice = event.data.json() } catch { /* mensagem sem conteúdo válido */ }
  event.waitUntil(self.registration.showNotification(notice.title ?? 'Syncro', { body: notice.body || '', icon: 'icons/pwa-192.png', data: { open: notice.open } }))
})

self.addEventListener('notificationclick', event => {
  const reminders = event.notification.data?.open === 'lembretes'
  event.notification.close()
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (open.length) {
      open[0].postMessage({ type: reminders ? 'syncro:open-reminders' : 'syncro:open-tasks' })
      await open[0].focus()
    } else await self.clients.openWindow(`./?abrir=${reminders ? 'lembretes' : 'tarefas'}`)
  })())
})
