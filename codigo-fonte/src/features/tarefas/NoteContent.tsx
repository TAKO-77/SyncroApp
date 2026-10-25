import type { ReactNode } from 'react'

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|_[^_\s](?:[^_\n]*[^_\s])?_)/g
const TRAILING = /[.,;:!?)\]]+$/
const TASK = /^(\s*)- \[( |x|X)\] (.*)$/

function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw.startsWith('www.') ? `https://${raw}` : raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch { return null }
}

function inline(text: string): ReactNode[] {
  return text.split(INLINE).flatMap((part, i): ReactNode[] => {
    if (i % 2 === 0) return part ? [part] : []
    if (part.startsWith('**')) return [<strong key={i}>{part.slice(2, -2)}</strong>]
    if (part.startsWith('`')) return [<code key={i}>{part.slice(1, -1)}</code>]
    if (part.startsWith('_')) return [<em key={i}>{part.slice(1, -1)}</em>]
    const tail = part.match(TRAILING)?.[0] ?? '', link = part.slice(0, part.length - tail.length), href = safeHref(link)
    return href ? [<a key={i} href={href} target="_blank" rel="noopener noreferrer">{link}</a>, tail] : [part]
  })
}

export function toggleTaskLine(note: string, index: number): string {
  const lines = note.split('\n')
  lines[index] = lines[index].replace(/^(\s*)- \[( |x|X)\]/, (_, pad: string, mark: string) => `${pad}- [${mark === ' ' ? 'x' : ' '}]`)
  return lines.join('\n')
}

export function NoteContent({ text, onToggle }: { text: string; onToggle: (lineIndex: number) => void }) {
  return <>{text.split('\n').map((line, i) => {
    const task = line.match(TASK)
    if (task) {
      const done = task[2] !== ' '
      return <label key={i} className={'note-task' + (done ? ' done' : '')}><input type="checkbox" checked={done} onChange={() => onToggle(i)} /><span>{inline(task[3])}</span></label>
    }
    if (line.startsWith('## ')) return <h3 key={i} className="note-h">{inline(line.slice(3))}</h3>
    if (line.startsWith('> ')) return <blockquote key={i} className="note-quote">{inline(line.slice(2))}</blockquote>
    if (line.startsWith('- ')) return <div key={i} className="note-li"><span aria-hidden="true">•</span><span>{inline(line.slice(2))}</span></div>
    const num = line.match(/^(\d+)\. (.*)$/)
    if (num) return <div key={i} className="note-li"><span>{num[1]}.</span><span>{inline(num[2])}</span></div>
    return line.trim() ? <p key={i} className="note-p">{inline(line)}</p> : <div key={i} className="note-gap" />
  })}</>
}
