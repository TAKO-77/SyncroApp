import { translator } from './i18n/translate.ts'
import type { Language } from './i18n/languages.ts'

// Limit of a task's notes. The same value is in the `tasks.notes` check of the database;
// scripts/test-sync.ts fails if the two differ.

export const TASK_NOTES_MAX = 10000
/** Limit of a workspace note, the same value as the `workspace_notes.text` check; a test compares them. */
export const NOTE_TEXT_MAX = 5000
/** From this length the editor shows how many characters are used. */
export const TASK_NOTES_WARN = 9000

const count = (n: number, lang: Language) => n.toLocaleString(translator(lang).locale)

/** Message for notes over the limit, or null. Notes are never cut, so the user decides what to remove. */
export function taskNotesError(notes = '', lang: Language = 'pt-PT'): string | null {
  const over = notes.length - TASK_NOTES_MAX
  return over > 0 ? translator(lang).t('tarefas.notesTooLong', { used: count(notes.length, lang), max: count(TASK_NOTES_MAX, lang), over: count(over, lang) }) : null
}

export const taskNotesCount = (notes = '', lang: Language = 'pt-PT') => `${count(notes.length, lang)} / ${count(TASK_NOTES_MAX, lang)}`
