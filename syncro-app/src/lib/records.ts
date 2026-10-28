// Helpers shared by every synced collection. Pure, so the Node test scripts can load it.

/** Same id format as the web app (`uid` in codigo-fonte), so ids never clash between the two apps. */
export const newId = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

/** Position for a new item: after the last one. Array order is stored as `position`, like the web app. */
export const nextPosition = (items: readonly { position: number }[]) =>
  items.reduce((max, i) => Math.max(max, i.position), -1) + 1

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string }

export const str = (v: unknown) => (typeof v === 'string' ? v : '')
