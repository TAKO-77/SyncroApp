import type { Rep } from '../types'
import { addDays, dow, hm, iso, minuteOfDay } from './dates.ts'
import type { Language } from './i18n/languages.ts'
import type { MessageKey } from './i18n/translate.ts'
export type Parsed = { task: string } | { title: string; date: string; start: string; end: string; rep: Rep }
export const RLB: Record<string, MessageKey> = { daily: 'quick.rep.daily', weekdays: 'quick.rep.weekdays', weekly: 'quick.rep.weekly' }

// The words quick add understands, one table per language. Only the account's language is read, so a word of
// another language (French "mar" against Portuguese "mar") never matches by accident. `t:` and times written
// `18:00`, `18h` or `18h30` work in every language.
interface Words {
  today: RegExp
  tomorrow: RegExp
  /** Daily, weekdays, weekly. */
  reps: [RegExp, Rep][]
  /** Monday to Sunday: each source is one group of the weekday expression. */
  days: string[]
  /** Text before and after the weekday group, and the flags. */
  edge: [string, string, string]
  /** German "morgen" also means "morning": with a weekday in the text, the weekday decides ("Montag morgen"). */
  tomorrowAfterDay?: boolean
  /** Rejects a short or ordinary word that is not meant as a day: `word` is what matched, `rest` what follows, `before` what precedes. */
  guard?: (word: string, rest: string, before: string) => boolean
  min: string
  hours: string
  /** The word before a start time ("at"), and the words before a whole range ("from"), as regex sources. */
  at: string
  from: string
  /** The words between the two times of a range. */
  link: RegExp
  /** English "6pm" and German "18 Uhr". */
  ampm?: boolean
  uhr?: boolean
  /** Portuguese has always removed every "às" from the title, not only the one before a time. */
  strayAt?: boolean
}

// Words in other languages need whole-word edges that know letters like ä and é, which `\b` does not.
const P = '(?:^|[^\\p{L}\\d])', Q = '(?![\\p{L}\\d])'
const whole = (src: string) => new RegExp(P + '(?:' + src + ')' + Q, 'iu')
const GENERIC: [string, string, string] = [P, Q, 'giu']
const NEXT_IS_TIME = /^\s*\d/

const WORDS: Record<Language, Words> = {
  'pt-PT': {
    today: /\bhoje\b/i,
    tomorrow: /amanh[ãa]/i,
    reps: [[/\b(todos os dias|diariamente|diário|diario)\b/i, 'daily'], [/\bdias [uú]teis\b/i, 'weekdays'], [/\b(semanalmente|semanal|todas as semanas)\b/i, 'weekly']],
    days: ['seg(?:unda)?', 'ter(?:[çc]a)?', 'qua(?:rta)?', 'qui(?:nta)?', 'sex(?:ta)?', 's[áa]b(?:ado)?', 'dom(?:ingo)?'],
    edge: ['\\b', '(?:-feira)?(?![a-zà-ú])', 'gi'],
    min: 'min', hours: 'horas?|hrs?', at: 'às', from: 'das|de', link: /^\s*(?:às|as|até|ate|a|-|–|—)\s*$/i, strayAt: true,
  },
  en: {
    today: whole('today'),
    tomorrow: whole('tomorrow'),
    reps: [[whole('daily|every\\s+day'), 'daily'], [whole('weekdays|every\\s+weekday|on\\s+weekdays'), 'weekdays'], [whole('weekly|every\\s+week'), 'weekly']],
    days: ['mon(?:day)?', 'tue(?:s(?:day)?)?', 'wed(?:nesday)?', 'thu(?:r(?:s(?:day)?)?)?', 'fri(?:day)?', 'sat(?:urday)?', 'sun(?:day)?'],
    edge: GENERIC,
    // "sat", "sun" and "wed" are everyday words ("Sun cream"): they count as days before a time, or capitalised after the title.
    guard: (word, rest, before) => !/^(?:sat|sun|wed)$/i.test(word) || NEXT_IS_TIME.test(rest) || (/^[A-Z]/.test(word) && !!before.trim()),
    min: 'min(?:s|utes?)?', hours: 'hrs?|hours?', at: 'at', from: 'from', link: /^\s*(?:to|until|till|-|–|—)\s*$/i, ampm: true,
  },
  de: {
    today: whole('heute'),
    // Lower case only: "Guten Morgen" is a greeting.
    tomorrow: new RegExp(P + 'morgen' + Q, 'u'), tomorrowAfterDay: true,
    reps: [[whole('täglich|jeden\\s+Tag'), 'daily'], [whole('werktags|an\\s+Werktagen|Werktage'), 'weekdays'], [whole('wöchentlich|jede\\s+Woche'), 'weekly']],
    days: ['Mo(?:ntag)?\\.?', 'Di(?:enstag)?\\.?', 'Mi(?:ttwoch)?\\.?', 'Do(?:nnerstag)?\\.?', 'Fr(?:eitag)?\\.?', 'Sa(?:mstag)?\\.?', 'So(?:nntag)?\\.?'],
    edge: GENERIC,
    // "Do" and "So" are ordinary words: a two-letter day counts only when capitalised and followed by a time or the end.
    guard: (word, rest) => word.replace('.', '').length > 2 || (/^\p{Lu}/u.test(word) && /^\s*(?:\d|$)/.test(rest)),
    min: 'min(?:s|uten?)?', hours: 'Std|Stunden?', at: 'um', from: 'von|ab', link: /^\s*(?:bis|-|–|—)\s*$/i, uhr: true,
  },
  fr: {
    today: whole('aujourd[’\']hui'),
    tomorrow: whole('demain'),
    reps: [[whole('tous\\s+les\\s+jours|quotidienn?e?|chaque\\s+jour'), 'daily'], [whole('jours\\s+ouvr[ée]s|en\\s+semaine'), 'weekdays'], [whole('chaque\\s+semaine|hebdomadaire|toutes\\s+les\\s+semaines'), 'weekly']],
    days: ['lun(?:di)?', 'mar(?:di)?', 'mer(?:credi)?', 'jeu(?:di)?', 'ven(?:dredi)?', 'sam(?:edi)?', 'dim(?:anche)?'],
    edge: GENERIC,
    // "mar", "mer", "jeu" and "sam" are also words or names ("la mer", "jeu vidéo"): they count as days before a time, or capitalised after the title.
    guard: (word, rest, before) => !/^(?:mar|mer|jeu|sam)$/i.test(word) || NEXT_IS_TIME.test(rest) || (/^\p{Lu}/u.test(word) && !!before.trim()),
    min: 'min(?:s|utes?)?', hours: 'heures?', at: 'à', from: 'de', link: /^\s*(?:à|a|jusqu[’']à|jusqu[’']a|-|–|—)\s*$/i,
  },
}

// Compiled once per language.
interface Compiled { weekday: RegExp; clock: RegExp; clockAt: RegExp; hasAt: RegExp; dropFrom: RegExp; hours: RegExp; mins: RegExp; stray?: RegExp }
const compiled = new Map<Language, Compiled>()
function compile(lang: Language): Compiled {
  const known = compiled.get(lang)
  if (known) return known
  const w = WORDS[lang], [pre, post, flags] = w.edge
  // "6pm" / "6:30pm", "18 Uhr" / "18:30 Uhr", and in every language "18:00", "18h", "18h30".
  const time = '\\b(?<h>\\d{1,2})(?:' + (w.ampm ? '(?::(?<c2>\\d{2}))?\\s?(?<ap>[ap]m)\\b|' : '') + ':(?<c>\\d{2})' + (w.uhr ? '(?:\\s?(?<u>Uhr)\\b)?' : '') + '|h(?<h2>\\d{2})?' + (w.uhr ? '|\\s?(?<u2>Uhr)\\b' : '') + ')(?!\\d)'
  const c: Compiled = {
    weekday: new RegExp(pre + '(?:' + w.days.map(d => '(' + d + ')').join('|') + ')' + post, flags),
    clock: new RegExp(time, 'gi'),
    clockAt: new RegExp('(?:(?:^|\\s)(?:' + w.at + ')\\s*)?' + time, 'gi'),
    hasAt: new RegExp('(^|\\s)(?:' + w.at + ')(\\s|$)', 'i'),
    dropFrom: new RegExp('(^|\\s)(?:' + w.from + '|' + w.at + ')\\s*$', 'i'),
    hours: new RegExp('(\\d+(?:[.,]\\d+)?)\\s?(?:' + w.hours + ')\\b', 'i'),
    mins: new RegExp('(\\d+)\\s?' + w.min + '\\b', 'i'),
    stray: w.strayAt ? new RegExp('(^|\\s)(?:' + w.at + ')(?=\\s|$)', 'gi') : undefined,
  }
  compiled.set(lang, c)
  return c
}

export function parseQ(q0: string, now = new Date(), lang: Language = 'pt-PT'): Parsed | null {
  let q = q0.trim(); if (!q) return null
  if (/^t:/i.test(q)) { const t = q.slice(2).trim(); return t ? { task: t } : null }
  const w = WORDS[lang], c = compile(lang)
  const today = iso(now)
  let rep: Rep = 'none', date = today, dur = 60, start: number | null = null, end: number | null = null
  for (const [r, v] of w.reps) if (r.test(q)) { rep = v; q = q.replace(r, ' ') }
  const dayFirst = w.tomorrowAfterDay && q.search(c.weekday) >= 0
  if (!dayFirst && w.tomorrow.test(q)) { date = addDays(today, 1); q = q.replace(w.tomorrow, ' ') }
  else if (w.today.test(q)) q = q.replace(w.today, ' ')
  else {
    for (const m of q.matchAll(c.weekday)) {
      const found = m.slice(1, 8).findIndex(Boolean), word = m[found + 1]
      if (w.guard && !w.guard(word, q.slice((m.index ?? 0) + m[0].length), q.slice(0, m.index ?? 0))) continue
      date = addDays(today, (found - dow(now) + 7) % 7)
      // "Montag morgen" is Monday morning: the "morgen" goes with the day.
      const after = q.slice((m.index ?? 0) + m[0].length), part = dayFirst ? after.replace(/^\s*morgen(?![\p{L}\d])/u, '') : after
      q = q.slice(0, m.index ?? 0) + ' ' + part
      break
    }
  }
  const mn = q.match(c.mins); if (mn) { dur = +mn[1]; q = q.replace(mn[0], ' ') }
  const hr = q.match(c.hours); if (hr) { dur = Math.round(parseFloat(hr[1].replace(',', '.')) * 60); q = q.replace(hr[0], ' ') }
  const ts = [...q.matchAll(c.clock)]
  const clock = (m: RegExpMatchArray) => !!(m.groups?.c || m.groups?.c2 || m.groups?.ap || m.groups?.u || m.groups?.u2)
  const val = (m: RegExpMatchArray) => {
    const g = m.groups ?? {}, ap = g.ap?.toLowerCase()
    let h = +g.h
    if (ap === 'pm' && h < 12) h += 12; else if (ap === 'am' && h === 12) h = 0
    return h * 60 + +(g.c || g.c2 || g.h2 || 0)
  }
  if (ts.length === 1) { const m = ts[0]; if (!clock(m) && +m.groups!.h < 6 && !c.hasAt.test(q)) dur = val(m); else start = val(m) }
  else if (ts.length > 1) {
    const [a, b] = ts, aAt = a.index ?? 0, bAt = b.index ?? 0
    start = val(a)
    // "17:30 às 3:00", "17:30-3:00" and "17:30 3:00" give the end time; "17:30 3h" gives a duration.
    if (clock(b) || w.link.test(q.slice(aAt + a[0].length, bAt))) {
      end = val(b) % 1440
      q = q.slice(0, aAt).replace(c.dropFrom, ' ') + ' ' + q.slice(bAt + b[0].length)
    } else dur = val(b)
  }
  q = q.replace(c.clockAt, ' ')
  if (c.stray) q = q.replace(c.stray, ' ')
  let title = q.replace(/\s+/g, ' ').trim(); if (!title) return null
  title = title[0].toUpperCase() + title.slice(1)
  if (start == null) start = date === today ? Math.min(minuteOfDay(now) + 1, 1439) : 540
  const stop = end !== null && end !== start ? end : (start + Math.min(dur, 1439)) % 1440
  return { title, date, start: hm(start), end: hm(stop), rep }
}
