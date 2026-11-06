// Limit of a task's notes. The same value is in the `tasks.notes` check of the database;
// scripts/test-sync.ts fails if the two differ.

export const TASK_NOTES_MAX = 10000
/** From this length the editor shows how many characters are used. */
export const TASK_NOTES_WARN = 9000

const count = (n: number) => n.toLocaleString('pt-PT')

/** Message for notes over the limit, or null. Notes are never cut, so the user decides what to remove. */
export function taskNotesError(notes = ''): string | null {
  const over = notes.length - TASK_NOTES_MAX
  return over > 0 ? `As notas têm ${count(notes.length)} caracteres e o limite é ${count(TASK_NOTES_MAX)}. Remove ${count(over)} para poderes guardar.` : null
}

export const taskNotesCount = (notes = '') => `${count(notes.length)} / ${count(TASK_NOTES_MAX)}`
