import { LOCALES, type Language } from './languages.ts'
import { ptPT } from './pt-PT.ts'
import { en } from './en.ts'
import { de } from './de.ts'
import { fr } from './fr.ts'

// Looks up the app's text. Pure, so the tests can check every language.

export type MessageKey = keyof typeof ptPT
export type Messages = Record<MessageKey, string>
/** A key with `.one` and `.other` forms, without the suffix. */
export type PluralKey = MessageKey extends infer K ? K extends `${infer B}.one` ? B : never : never
export type Vars = Record<string, string | number>

export const MESSAGES: Record<Language, Messages> = { 'pt-PT': ptPT, en, de, fr }

const fill = (text: string, vars?: Vars) => vars ? text.replace(/\{(\w+)\}/g, (all, name: string) => name in vars ? String(vars[name]) : all) : text

export interface Translator {
  lang: Language
  /** Locale for Intl and toLocale* calls. */
  locale: string
  t: (key: MessageKey, vars?: Vars) => string
  /** The form for the count `n`, which also fills `{n}`. */
  tn: (key: PluralKey, n: number, vars?: Vars) => string
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
  }
  cache.set(lang, made)
  return made
}
