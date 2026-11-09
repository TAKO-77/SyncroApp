import { useStore } from '../../store/useStore'
import { desktop } from '../desktop'
import { readItem, writeItem } from '../storage'
import { DEFAULT_LANGUAGE, isLanguage, languageFromLocales, type Language } from './languages'
import { translator } from './translate'

// The language in use: the account's once signed in; before that, the last one used on this device or the system's.

const LANGUAGE_KEY = 'syncro-language'

export function deviceLanguage(): Language {
  const saved = readItem(LANGUAGE_KEY)
  if (isLanguage(saved)) return saved
  return languageFromLocales(navigator.languages?.length ? navigator.languages : [navigator.language])
}

/** Only a language chosen before on this device; new accounts use it until the sign-in screen is translated. */
export function savedLanguage(): Language {
  const saved = readItem(LANGUAGE_KEY)
  return isLanguage(saved) ? saved : DEFAULT_LANGUAGE
}

const pick = (s: { userId: string | null; data: { language: Language } }) => s.userId ? s.data.language : deviceLanguage()
export const currentLanguage = () => pick(useStore.getState())
export const useLanguage = () => useStore(pick)
export const useT = () => translator(useLanguage())
/** For code outside components (dialogs opened from handlers, notifications). */
export const tr = () => translator(currentLanguage())

/**
 * Keeps <html lang>, the device's copy and the Windows host in step, so the sign-in screen, the next start and the
 * tray menu use the account's language.
 */
export function trackLanguage() {
  const apply = (lang: Language) => { document.documentElement.lang = lang; desktop?.postMessage(`syncro:language:${lang}`) }
  apply(currentLanguage())
  useStore.subscribe((s, prev) => {
    const lang = pick(s)
    if (lang === pick(prev) && s.userId === prev.userId) return
    if (s.userId) writeItem(LANGUAGE_KEY, lang)
    apply(lang)
  })
}
