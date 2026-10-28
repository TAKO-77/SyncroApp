import type { WorkspaceNote } from '../types/tasks'
import { str, type Validation } from './records.ts'

// Workspace notes (`public.workspace_notes`) and the small markdown subset they use, same as the web app's NoteContent. Pure.

export const NOTE_MAX = 5000

export const noteFromRow = (row: Record<string, unknown>): WorkspaceNote =>
  ({ id: str(row.id), workspaceId: str(row.workspace_id), text: str(row.text), position: Number(row.position ?? 0) })

export const noteToRow = (n: WorkspaceNote) => ({ id: n.id, workspace_id: n.workspaceId, text: n.text, position: n.position })

export function validateNote(text: string): Validation<string> {
  return text.length > NOTE_MAX ? { ok: false, error: `A nota pode ter até ${NOTE_MAX} caracteres.` } : { ok: true, value: text }
}

export type Inline =
  | { kind: 'text' | 'bold' | 'italic' | 'code'; text: string }
  | { kind: 'link'; text: string; href: string }

export type NoteLine =
  | { kind: 'task'; done: boolean; content: Inline[] }
  | { kind: 'heading' | 'quote' | 'bullet' | 'paragraph'; content: Inline[] }
  | { kind: 'numbered'; number: string; content: Inline[] }
  | { kind: 'gap' }

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|_[^_\s](?:[^_\n]*[^_\s])?_)/g
const TRAILING = /[.,;:!?)\]]+$/
const TASK = /^(\s*)- \[( |x|X)\] (.*)$/

/** Only http(s) links are opened; `www.` links get `https://`. */
export function safeHref(raw: string): string | null {
  const url = raw.startsWith('www.') ? `https://${raw}` : raw
  return /^https?:\/\/[^\s<>"]+$/i.test(url) ? url : null
}

export function parseInline(text: string): Inline[] {
  return text.split(INLINE).flatMap((part, i): Inline[] => {
    if (i % 2 === 0) return part ? [{ kind: 'text', text: part }] : []
    if (part.startsWith('**')) return [{ kind: 'bold', text: part.slice(2, -2) }]
    if (part.startsWith('`')) return [{ kind: 'code', text: part.slice(1, -1) }]
    if (part.startsWith('_')) return [{ kind: 'italic', text: part.slice(1, -1) }]
    // Punctuation right after a link ("veja www.x.pt.") is not part of it.
    const tail = part.match(TRAILING)?.[0] ?? '', link = part.slice(0, part.length - tail.length), href = safeHref(link)
    if (!href) return [{ kind: 'text', text: part }]
    return tail ? [{ kind: 'link', text: link, href }, { kind: 'text', text: tail }] : [{ kind: 'link', text: link, href }]
  })
}

export function parseNote(text: string): NoteLine[] {
  return text.split('\n').map((line): NoteLine => {
    const task = line.match(TASK)
    if (task) return { kind: 'task', done: task[2] !== ' ', content: parseInline(task[3]) }
    if (line.startsWith('## ')) return { kind: 'heading', content: parseInline(line.slice(3)) }
    if (line.startsWith('> ')) return { kind: 'quote', content: parseInline(line.slice(2)) }
    if (line.startsWith('- ')) return { kind: 'bullet', content: parseInline(line.slice(2)) }
    const numbered = line.match(/^(\d+)\. (.*)$/)
    if (numbered) return { kind: 'numbered', number: numbered[1], content: parseInline(numbered[2]) }
    return line.trim() ? { kind: 'paragraph', content: parseInline(line) } : { kind: 'gap' }
  })
}

/** Ticks or unticks the task on line `index`. */
export function toggleTaskLine(note: string, index: number): string {
  const lines = note.split('\n')
  lines[index] = lines[index].replace(/^(\s*)- \[( |x|X)\]/, (_, pad: string, mark: string) => `${pad}- [${mark === ' ' ? 'x' : ' '}]`)
  return lines.join('\n')
}

export interface Selection { start: number; end: number }

/** Wraps the selection (or the word "texto" when nothing is selected) with `before`/`after`, e.g. `**`. */
export function wrapSelection(text: string, sel: Selection, before: string, after = before): { text: string; selection: Selection } {
  const selected = text.slice(sel.start, sel.end) || 'texto'
  const start = sel.start + before.length
  return { text: text.slice(0, sel.start) + before + selected + after + text.slice(sel.end), selection: { start, end: start + selected.length } }
}

/** Adds `prefix` (e.g. `- [ ] `) to the start of every line the selection touches. */
export function prefixLines(text: string, sel: Selection, prefix: string): { text: string; selection: Selection } {
  const from = text.lastIndexOf('\n', sel.start - 1) + 1
  const block = text.slice(from, sel.end) || 'texto'
  const replacement = block.split('\n').map(l => prefix + l).join('\n')
  const end = from + replacement.length
  return { text: text.slice(0, from) + replacement + text.slice(sel.end), selection: { start: end, end } }
}
