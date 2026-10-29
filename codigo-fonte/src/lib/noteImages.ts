import { supabase } from './supabase'
import { useAuth } from '../store/useAuth'

// Note images live in the private 'note-images' bucket under '<user id>/<file>'.
// A note references one with a line '![imagem](imagem:<file>)'.

const BUCKET = 'note-images'
const MAX_SIDE = 1600
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_LINE = /^!\[([^\]\n]*)\]\(imagem:([a-z0-9-]+\.jpg)\)$/

export const imageMarkdown = (file: string) => `![imagem](imagem:${file})`

const folder = () => {
  const { user, offline } = useAuth.getState()
  if (!user || offline) throw new Error('Sem ligação. As imagens só podem ser carregadas com internet.')
  return user.id
}

/** Scales the image down to at most MAX_SIDE pixels and re-encodes it as JPEG. */
async function compress(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error()
    // JPEG has no transparency; paint a white background so transparent PNGs stay legible.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) throw new Error()
    return blob
  } finally { URL.revokeObjectURL(url) }
}

/** Uploads an image and returns the file name to reference in the note. */
export async function uploadNoteImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Escolhe uma imagem JPG, PNG ou WebP até 15 MB.')
  const userId = folder()
  let blob: Blob
  try { blob = await compress(file) } catch { throw new Error('Não foi possível ler a imagem. Tenta outra.') }
  const name = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(`${userId}/${name}`, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error('Não foi possível carregar a imagem. Tenta novamente.')
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
