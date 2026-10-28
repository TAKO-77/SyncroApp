import { useRef, useState } from 'react'
import { NoteContent, toggleTaskLine } from './NoteContent'

/** One note box: shows the formatted text and switches to an editor with a formatting toolbar. */
export function NoteCard({ text, editing, onEdit, onSave, onCancel, onDelete }: {
  text: string; editing: boolean; onEdit: () => void; onSave: (text: string) => void; onCancel: () => void; onDelete: () => void
}) {
  const [draft, setDraft] = useState(text)
  const editor = useRef<HTMLTextAreaElement>(null)
  const startEditing = () => { setDraft(text); onEdit() }

  const format = (before: string, after = before, line = false) => {
    const input = editor.current
    if (!input) return
    if (line) {
      // Line formats apply at the start of every selected line so the notes view recognises them.
      const from = draft.lastIndexOf('\n', input.selectionStart - 1) + 1, to = input.selectionEnd
      const block = draft.slice(from, to) || 'texto'
      const replacement = block.split('\n').map(l => before + l).join('\n')
      setDraft(draft.slice(0, from) + replacement + draft.slice(to))
      requestAnimationFrame(() => { input.focus(); input.setSelectionRange(from + replacement.length, from + replacement.length) })
      return
    }
    const start = input.selectionStart, end = input.selectionEnd
    const selected = draft.slice(start, end) || 'texto'
    setDraft(draft.slice(0, start) + `${before}${selected}${after}` + draft.slice(end))
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + before.length, start + before.length + selected.length) })
  }

  if (editing) return <div className="note-card editing">
    <div className="note-toolbar" aria-label="Formatação do texto">
      <button type="button" title="Negrito" aria-label="Negrito" onClick={() => format('**')}>B</button><button type="button" title="Itálico" aria-label="Itálico" onClick={() => format('_')}><i>I</i></button><span />
      <button type="button" title="Título" aria-label="Título" onClick={() => format('## ', '', true)}>H</button><button type="button" title="Citação" aria-label="Citação" onClick={() => format('> ', '', true)}>❞</button><button type="button" title="Código" aria-label="Código" onClick={() => format('`')}>{'<>'}</button><span />
      <button type="button" title="Lista com pontos" aria-label="Lista com pontos" onClick={() => format('- ', '', true)}>•</button><button type="button" title="Lista numerada" aria-label="Lista numerada" onClick={() => format('1. ', '', true)}>1.</button><button type="button" title="Lista de tarefas" aria-label="Lista de tarefas" onClick={() => format('- [ ] ', '', true)}>☐</button>
    </div>
    <textarea ref={editor} rows={6} maxLength={5000} value={draft} aria-label="Texto da nota" placeholder="Escreve tópicos ou texto… Usa a barra para formatar." onChange={e => setDraft(e.target.value)} autoFocus />
    <div className="acts"><button type="button" className="btn" onClick={onCancel}>Cancelar</button><button type="button" className="btn pri" onClick={() => onSave(draft)}>Guardar</button></div>
  </div>

  return <div className="note-card">
    <div className="note-card-tools">
      <button type="button" className="note-icon" title="Editar nota" aria-label="Editar nota" onClick={startEditing}>✎</button>
      <button type="button" className="note-icon del" title="Apagar nota" aria-label="Apagar nota" onClick={onDelete}>✕</button>
    </div>
    <div className="task-notes-content" onDoubleClick={startEditing}>{text ? <NoteContent text={text} onToggle={i => onSave(toggleTaskLine(text, i))} /> : <span className="mu">Nota vazia.</span>}</div>
  </div>
}
