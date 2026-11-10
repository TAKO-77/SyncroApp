import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { uid } from '../../components/common'
import { useT } from '../../lib/i18n/useT'
import { addSubtaskDraft, type SubtaskDraft } from '../../lib/subtasks'
import { TASK_TITLE_MAX } from '../../lib/tasks'

/** Quick list of subtasks in the main task's editor. Changes stay in the draft until the task is saved. */
export function SubtaskList({ subtasks, onChange, newTitle, onNewTitle }: {
  subtasks: SubtaskDraft[]; onChange: (subtasks: SubtaskDraft[]) => void; newTitle: string; onNewTitle: (title: string) => void
}) {
  const { t } = useT()
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
    <span id={`${baseId}-label`} className="subtasks-label">{t('tarefas.sub.title')}</span>
    {subtasks.length > 0 && <ul className="subtask-list">{subtasks.map((s, i) => {
      const blank = !s.t.trim(), errorId = `${baseId}-${s.id}-error`
      return <li key={s.id} className={'subtask' + (s.d ? ' dn' : '')}>
        <input className="rc" type="checkbox" checked={s.d} aria-label={t('tarefas.sub.doneAria', { n: i + 1 })} onChange={e => edit(s.id, { d: e.target.checked })} />
        <input className="subtask-title" type="text" value={s.t} maxLength={TASK_TITLE_MAX} autoComplete="off" aria-label={t('tarefas.sub.titleAria', { n: i + 1 })} aria-invalid={blank} aria-describedby={blank ? errorId : undefined} onChange={e => edit(s.id, { t: e.target.value })} />
        <button type="button" className="x" title={t('tarefas.sub.delete')} aria-label={t('tarefas.sub.deleteAria', { n: i + 1 })} onClick={() => remove(s.id)}>✕</button>
        {blank && <small id={errorId} className="field-error" role="alert">{t('tarefas.sub.blank')}</small>}
      </li>
    })}</ul>}
    <div className="subtask-add">
      <input ref={addInput} type="text" value={newTitle} maxLength={TASK_TITLE_MAX} autoComplete="off" placeholder={t('tarefas.sub.placeholder')} aria-label={t('tarefas.sub.newAria')} aria-invalid={addError} aria-describedby={addError ? `${baseId}-add-error` : undefined} onChange={e => { onNewTitle(e.target.value); setAddError(false) }} />
      <button type="button" className="btn" onClick={add}>{t('tarefas.add')}</button>
    </div>
    {addError && <small id={`${baseId}-add-error`} className="field-error" role="alert">{t('tarefas.sub.needTitle')}</small>}
  </div>
}
