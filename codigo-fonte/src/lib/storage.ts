// Device storage. Private windows, blocked site data and a full quota make localStorage throw;
// the app then works without remembering, so every failure reads as "nothing saved".

export function readItem(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writeItem(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* nothing saved */ }
}

export function removeItem(key: string) {
  try { localStorage.removeItem(key) } catch { /* nothing saved */ }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readItem(key)
  try { return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}

export const writeJson = (key: string, value: unknown) => writeItem(key, JSON.stringify(value))

/** An on/off preference that is on unless turned off. */
export const readFlag = (key: string) => readItem(key) !== 'false'
