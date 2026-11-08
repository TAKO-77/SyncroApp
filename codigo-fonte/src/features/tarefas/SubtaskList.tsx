import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { uid } from '../../components/common'
import { addSubtaskDraft, type SubtaskDraft } from '../../lib/subtasks'
import { TASK_TITLE_MAX } from '../../lib/tasks'

/** Quick list of subtasks in the main task's editor. Changes stay in the draft until the task is saved. */
export function SubtaskList({ subtasks, onChange, newTitle, onNewTitle }: {
  subtasks: SubtaskDraft[]; onChange: (subtasks: SubtaskDraft[]) => void; newTitle: string; onNewTitle: (title: string) => void
}) {
  const baseId = useId()
  const addInput = useRef<HTMLInputElement>(null)
  const [addError, setAddError] = useState(false)
  const edit = (id: string, change: Partial<SubtaskDraft>) => onChange(subtasks.map(s => (s.id === id ? { ...s, ...change } : s)))
  const remove = (id: string) => { onChange(subtasks.filter(s => s.id !== id)); addInput.current?.focus() }
  const add = () => {
    const next = addSubtaskDraft(subtasks, newTitle, uid('t'))
    if (!next) { setAddError(true); addInput.current?.focus(); return }
    onChange(next); onNewTitle(''); setAddError(false); addInput.current?.focus()
  }
  // Enter in any of these inputs would otherwise submit the task form.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return
    e.preventDefault()
    if (e.target === addInput.current) add()
    else if (e.target.type === 'text') addInput.current?.focus()
  }

  return <div className="w subtasks" role="group" aria-labelledby={`${baseId}-label`} onKeyDown={onKeyDown}>
    <span id={`${baseId}-label`} className="subtasks-label">Subtarefas</span>
    {subtasks.length > 0 && <ul className="subtask-list">{subtasks.map((s, i) => {
      const blank = !s.t.trim(), errorId = `${baseId}-${s.id}-error`
      return <li key={s.id} className={'subtask' + (s.d ? ' dn' : '')}>
        <input className="rc" type="checkbox" checked={s.d} aria-label={`Subtarefa ${i + 1} concluída`} onChange={e => edit(s.id, { d: e.target.checked })} />
        <input className="subtask-title" type="text" value={s.t} maxLength={TASK_TITLE_MAX} autoComplete="off" aria-label={`Título da subtarefa ${i + 1}`} aria-invalid={blank} aria-describedby={blank ? errorId : undefined} onChange={e => edit(s.id, { t: e.target.value })} />
        <button type="button" className="x" title="Eliminar subtarefa" aria-label={`Eliminar subtarefa ${i + 1}`} onClick={() => remove(s.id)}>✕</button>
        {blank && <small id={errorId} className="field-error" role="alert">A subtarefa precisa de um título.</small>}
      </li>
    })}</ul>}
    <div className="subtask-add">
      <input ref={addInput} type="text" value={newTitle} maxLength={TASK_TITLE_MAX} autoComplete="off" placeholder="Nova subtarefa…" aria-label="Nova subtarefa" aria-invalid={addError} aria-describedby={addError ? `${baseId}-add-error` : undefined} onChange={e => { onNewTitle(e.target.value); setAddError(false) }} />
      <button type="button" className="btn" onClick={add}>Adicionar</button>
    </div>
    {addError && <small id={`${baseId}-add-error`} className="field-error" role="alert">Escreve um título para a subtarefa.</small>}
  </div>
}
