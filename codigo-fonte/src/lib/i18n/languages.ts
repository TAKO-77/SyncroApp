// The languages the app is written in. The list matches the check on profiles.language; a test compares them.

export const LANGUAGES = ['pt-PT', 'en', 'de', 'fr'] as const
export type Language = typeof LANGUAGES[number]
export const DEFAULT_LANGUAGE: Language = 'pt-PT'

/** Each language in its own name, as offered in Definições. */
export const LANGUAGE_NAMES: Record<Language, string> = { 'pt-PT': 'Português', en: 'English', de: 'Deutsch', fr: 'Français' }

/** Locale for dates and numbers: British English keeps the day before the month and a 24-hour clock. */
export const LOCALES: Record<Language, string> = { 'pt-PT': 'pt-PT', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language)

/** The first supported language in the system's list; any Portuguese counts as pt-PT. */
export function languageFromLocales(locales: readonly string[]): Language {
  for (const locale of locales) {
    const base = locale.toLowerCase().split('-')[0]
    if (base === 'pt') return 'pt-PT'
    if (isLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}
