import { supabase } from './supabase'
import { useAuth } from '../store/useAuth'
import { drawImage, isAcceptedImage } from './images'
import { tr } from './i18n/useT'

// Note images live in the private 'note-images' bucket under '<user id>/<file>'.
// A note references one with a line '![imagem](imagem:<file>)'.

const BUCKET = 'note-images'
const MAX_SIDE = 1600
export const IMAGE_LINE = /^!\[([^\]\n]*)\]\(imagem:([a-z0-9-]+\.jpg)\)$/

export const imageMarkdown = (file: string) => `![imagem](imagem:${file})`

const folder = () => {
  const { user, offline } = useAuth.getState()
  if (!user || offline) throw new Error(tr().t('tarefas.image.offline'))
  return user.id
}

/** Scales the image down to at most MAX_SIDE pixels and re-encodes it as JPEG. */
async function compress(file: File): Promise<Blob> {
  const canvas = await drawImage(file, (width, height) => {
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
    return { width: Math.round(width * scale), height: Math.round(height * scale) }
  })
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error()
  return blob
}

/** Uploads an image and returns the file name to reference in the note. */
export async function uploadNoteImage(file: File): Promise<string> {
  if (!isAcceptedImage(file, 15)) throw new Error(tr().t('tarefas.image.badType'))
  const userId = folder()
  let blob: Blob
  try { blob = await compress(file) } catch { throw new Error(tr().t('tarefas.image.unreadable')) }
  const name = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(`${userId}/${name}`, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error(tr().t('tarefas.image.uploadFailed'))
  cache.set(name, Promise.resolve(URL.createObjectURL(blob)))
  return name
}

const cache = new Map<string, Promise<string>>()

/** Downloads a note image once per session and returns a local object URL for it. */
export function noteImageUrl(name: string): Promise<string> {
  const cached = cache.get(name)
  if (cached) return cached
  const request = (async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(`${folder()}/${name}`)
    if (error || !data) throw new Error()
    return URL.createObjectURL(data)
  })()
  // Forget failures so the image is retried once the connection returns.
  request.catch(() => cache.delete(name))
  cache.set(name, request)
  return request
}

const REFERENCE = /imagem:([a-z0-9-]+\.jpg)/g
const PAGE = 1000
// A file uploaded on another device may not have its note synced yet; leave recent files alone.
const MIN_AGE_MS = 60 * 60 * 1000

/**
 * Deletes this user's note images that no note refers to any more. A file is kept if it appears in
 * a note on the server, in the local data or in the undo history, so undoing a deletion still works.
 */
export async function cleanUpNoteImages(localSnapshots: string[]): Promise<void> {
  const { user, offline } = useAuth.getState()
  if (!user || offline) return
  const referenced = new Set<string>()
  const collect = (text: string) => { for (const m of text.matchAll(REFERENCE)) referenced.add(m[1]) }
  localSnapshots.forEach(collect)
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('workspace_notes').select('text').eq('deleted', false).range(from, from + PAGE - 1)
    if (error) return
    data.forEach(n => collect(String(n.text ?? '')))
    if (data.length < PAGE) break
  }
  const unused: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(user.id, { limit: PAGE, offset })
    if (error) return
    const cutoff = Date.now() - MIN_AGE_MS
    data.forEach(f => { if (!referenced.has(f.name) && f.created_at && new Date(f.created_at).getTime() < cutoff) unused.push(f.name) })
    if (data.length < PAGE) break
  }
  for (let i = 0; i < unused.length; i += 100) {
    const batch = unused.slice(i, i + 100)
    const { error } = await supabase.storage.from(BUCKET).remove(batch.map(name => `${user.id}/${name}`))
    if (error) return
    batch.forEach(name => cache.delete(name))
  }
}
