import type { ReactNode } from 'react'

/** Empty card content: icon tile, short text and an optional action. `compact` is for cards on Início. */
export function EmptyState({ icon, title, text, action, compact }: { icon: ReactNode; title: string; text?: string; action?: ReactNode; compact?: boolean }) {
  return <div className={'empty' + (compact ? ' compact' : '')}>
    <span className="empty-ic" aria-hidden="true">{icon}</span>
    <span className="empty-t"><b>{title}</b>{text && <small>{text}</small>}</span>
    {action}
  </div>
}
