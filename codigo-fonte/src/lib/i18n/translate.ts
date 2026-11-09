import { LOCALES, type Language } from './languages.ts'
import { DAY_LONG, DAY_SHORT, MONTH_LONG, MONTH_SHORT, dayMonth } from './calendar.ts'
import { settings } from './areas/settings.ts'
import { app } from './areas/app.ts'
import { auth } from './areas/auth.ts'
import { inicio } from './areas/inicio.ts'
import { perfil } from './areas/perfil.ts'
import { agenda } from './areas/agenda.ts'
import { calendario } from './areas/calendario.ts'
import { quick } from './areas/quick.ts'
import { tarefas } from './areas/tarefas.ts'
import { lembretes } from './areas/lembretes.ts'
import { financas } from './areas/financas.ts'
import { common } from './areas/common.ts'

// Looks up the app's text. Pure, so the tests can check every language.

export const AREAS = [settings, app, auth, inicio, perfil, agenda, calendario, quick, tarefas, lembretes, financas, common] as const
type KeysOf<A> = A extends { 'pt-PT': infer M } ? keyof M : never
export type MessageKey = KeysOf<typeof AREAS[number]> & string
export type Messages = Record<MessageKey, string>
/** A key with `.one` and `.other` forms, without the suffix. */
export type PluralKey = MessageKey extends infer K ? K extends `${infer B}.one` ? B : never : never
export type Vars = Record<string, string | number>

export const MESSAGES = Object.fromEntries((['pt-PT', 'en', 'de', 'fr'] as const).map(lang =>
  [lang, Object.assign({}, ...AREAS.map(area => area[lang])) as Messages])) as Record<Language, Messages>

const fill = (text: string, vars?: Vars) => vars ? text.replace(/\{(\w+)\}/g, (all, name: string) => name in vars ? String(vars[name]) : all) : text

export interface Translator {
  lang: Language
  /** Locale for Intl and toLocale* calls. */
  locale: string
  t: (key: MessageKey, vars?: Vars) => string
  /** The form for the count `n`, which also fills `{n}`. */
  tn: (key: PluralKey, n: number, vars?: Vars) => string
  /** Monday-first day names and month names, short and long. */
  days: readonly string[]
  daysLong: readonly string[]
  months: readonly string[]
  monthsLong: readonly string[]
  /** "4 nov" for a `YYYY-MM-DD` day. */
  shortDate: (day: string) => string
}

const cache = new Map<Language, Translator>()
export function translator(lang: Language): Translator {
  const known = cache.get(lang)
  if (known) return known
  const dict = MESSAGES[lang], rules = new Intl.PluralRules(LOCALES[lang])
  const made: Translator = {
    lang,
    locale: LOCALES[lang],
    t: (key, vars) => fill(dict[key], vars),
    tn: (key, n, vars) => fill(dict[`${key}.${rules.select(n) === 'one' ? 'one' : 'other'}` as MessageKey], { n, ...vars }),
    days: DAY_SHORT[lang],
    daysLong: DAY_LONG[lang],
    months: MONTH_SHORT[lang],
    monthsLong: MONTH_LONG[lang],
    shortDate: day => { const [, m, d] = day.split('-').map(Number); return dayMonth(lang, d, m - 1) },
  }
  cache.set(lang, made)
  return made
}
