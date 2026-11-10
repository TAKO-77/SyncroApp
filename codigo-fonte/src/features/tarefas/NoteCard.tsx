import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { NoteContent, toggleTaskLine } from './NoteContent'
import { NoteImage } from './NoteImage'
import { IMAGE_LINE, imageMarkdown, uploadNoteImage } from '../../lib/noteImages'
import { IMAGE_ACCEPT } from '../../lib/images'
import { NOTE_TEXT_MAX } from '../../lib/taskNotes'
import { useT } from '../../lib/i18n/useT'

/** One note box: shows the formatted text and switches to an editor with a formatting toolbar. */
export function NoteCard({ text, editing, onEdit, onSave, onCancel, onDelete }: {
  text: string; editing: boolean; onEdit: () => void; onSave: (text: string) => void; onCancel: () => void; onDelete: () => void
}) {
  const { t } = useT()
  const [draft, setDraft] = useState(text)
  const editor = useRef<HTMLTextAreaElement>(null)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const latestDraft = useRef(draft)
  latestDraft.current = draft
  const startEditing = () => { setDraft(text); onEdit() }

  /** Uploads the image and places its line at the cursor, on a line of its own. */
  const addImage = async (file?: File) => {
    if (!file || uploading) return
    const at = editor.current?.selectionStart ?? draft.length
    setImageError('')
    setUploading(true)
    try {
      const line = imageMarkdown(await uploadNoteImage(file))
      // The upload can take a while, so insert into the text as it is now, not as it was when it started.
      const current = latestDraft.current, pos = Math.min(at, current.length), before = current.slice(0, pos), after = current.slice(pos)
      const next = before + (before && !before.endsWith('\n') ? '\n' : '') + line + (after.startsWith('\n') ? '' : '\n') + after
      if (next.length > NOTE_TEXT_MAX) setImageError(t('tarefas.image.noSpace'))
      else setDraft(next)
    } catch (e) { setImageError(e instanceof Error ? e.message : t('tarefas.image.failed')) }
    finally { setUploading(false) }
  }
  const removeImageLine = (index: number) => setDraft(current => current.split('\n').filter((_, i) => i !== index).join('\n'))
  const draftImages = draft.split('\n').flatMap((line, index) => { const m = line.match(IMAGE_LINE); return m ? [{ index, file: m[2] }] : [] })

  const format = (before: string, after = before, line = false) => {
    const input = editor.current
    if (!input) return
    if (line) {
      // Line formats apply at the start of every selected line so the notes view recognises them.
      const from = draft.lastIndexOf('\n', input.selectionStart - 1) + 1, to = input.selectionEnd
      const block = draft.slice(from, to) || t('tarefas.note.sample')
      const replacement = block.split('\n').map(l => before + l).join('\n')
      setDraft(draft.slice(0, from) + replacement + draft.slice(to))
      requestAnimationFrame(() => { input.focus(); input.setSelectionRange(from + replacement.length, from + replacement.length) })
      return
    }
    const start = input.selectionStart, end = input.selectionEnd
    const selected = draft.slice(start, end) || t('tarefas.note.sample')
    setDraft(draft.slice(0, start) + `${before}${selected}${after}` + draft.slice(end))
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + before.length, start + before.length + selected.length) })
  }

  if (editing) return <div className="note-card editing">
    <div className="note-toolbar" aria-label={t('tarefas.note.toolbar')}>
      <button type="button" title={t('tarefas.note.bold')} aria-label={t('tarefas.note.bold')} onClick={() => format('**')}>B</button><button type="button" title={t('tarefas.note.italic')} aria-label={t('tarefas.note.italic')} onClick={() => format('_')}><i>I</i></button><span />
      <button type="button" title={t('tarefas.note.heading')} aria-label={t('tarefas.note.heading')} onClick={() => format('## ', '', true)}>H</button><button type="button" title={t('tarefas.note.quote')} aria-label={t('tarefas.note.quote')} onClick={() => format('> ', '', true)}>❞</button><button type="button" title={t('tarefas.note.code')} aria-label={t('tarefas.note.code')} onClick={() => format('`')}>{'<>'}</button><span />
      <button type="button" title={t('tarefas.note.bullets')} aria-label={t('tarefas.note.bullets')} onClick={() => format('- ', '', true)}>•</button><button type="button" title={t('tarefas.note.numbered')} aria-label={t('tarefas.note.numbered')} onClick={() => format('1. ', '', true)}>1.</button><button type="button" title={t('tarefas.note.checklist')} aria-label={t('tarefas.note.checklist')} onClick={() => format('- [ ] ', '', true)}>☐</button><span />
      <button type="button" title={t('tarefas.image.add')} aria-label={t('tarefas.image.add')} disabled={uploading} onClick={() => picker.current?.click()}><ImagePlus size={16} strokeWidth={1.5} aria-hidden="true" /></button>
      {uploading && <small className="mu" role="status">{t('tarefas.image.uploading')}</small>}
      <input ref={picker} type="file" accept={IMAGE_ACCEPT} hidden onChange={e => { void addImage(e.target.files?.[0]); e.target.value = '' }} />
    </div>
    <textarea ref={editor} rows={6} maxLength={NOTE_TEXT_MAX} value={draft} aria-label={t('tarefas.note.textAria')} placeholder={t('tarefas.note.placeholder')} onChange={e => setDraft(e.target.value)}
      onPaste={e => { const image = [...e.clipboardData.files].find(f => f.type.startsWith('image/')); if (image) { e.preventDefault(); void addImage(image) } }} autoFocus />
    {imageError && <small className="note-img-error" role="alert">{imageError}</small>}
    {draftImages.length > 0 && <div className="note-thumbs" aria-label={t('tarefas.image.list')}>{draftImages.map(({ index, file }) => <div key={file + index} className="note-thumb">
      <NoteImage file={file} alt={t('tarefas.image.alt')} className="note-thumb-img" />
      <button type="button" className="note-icon del" title={t('tarefas.image.remove')} aria-label={t('tarefas.image.remove')} onClick={() => removeImageLine(index)}>✕</button>
    </div>)}</div>}
    <div className="acts"><button type="button" className="btn" onClick={onCancel}>{t('tarefas.cancel')}</button><button type="button" className="btn pri" disabled={uploading} onClick={() => onSave(draft)}>{t('tarefas.save')}</button></div>
  </div>

  return <div className="note-card">
    <div className="note-card-tools">
      <button type="button" className="note-icon" title={t('tarefas.note.edit')} aria-label={t('tarefas.note.edit')} onClick={startEditing}>✎</button>
      <button type="button" className="note-icon del" title={t('tarefas.note.delete')} aria-label={t('tarefas.note.delete')} onClick={onDelete}>✕</button>
    </div>
    <div className="task-notes-content" onDoubleClick={startEditing}>{text ? <NoteContent text={text} onToggle={i => onSave(toggleTaskLine(text, i))} /> : <span className="mu">{t('tarefas.note.empty')}</span>}</div>
  </div>
}
