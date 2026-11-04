// Loaded by the generated service worker (workbox importScripts in vite.config.ts): shows task reminders and opens the tasks on tap.

self.addEventListener('push', event => {
  let notice = {}
  try { notice = event.data.json() } catch { /* mensagem sem conteúdo válido */ }
  event.waitUntil(self.registration.showNotification(notice.title ?? 'Syncro', { body: notice.body || '', icon: 'icons/pwa-192.png' }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (open.length) {
      open[0].postMessage({ type: 'syncro:open-tasks' })
      await open[0].focus()
    } else await self.clients.openWindow('./?abrir=tarefas')
  })())
})
