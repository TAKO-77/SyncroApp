import { useToast } from '../store/toast'
export function Toast() {
  const { t, hide } = useToast()
  if (!t) return null
  return <div className="toast" role="status"><span>{t.msg}</span>{t.actions.map(a => <button key={a.label} onClick={() => { a.fn(); hide() }}>{a.label}</button>)}</div>
}
