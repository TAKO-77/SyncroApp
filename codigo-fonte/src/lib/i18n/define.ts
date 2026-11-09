import type { Language } from './languages.ts'

// The app's text is split by area (areas/*.ts), each with every language side by side. European Portuguese is the
// source: the other languages must have exactly its keys, or the build fails. Keys start with the area's name.
// `{name}` is filled in by `t`; keys ending in `.one`/`.other` are chosen by `tn` from the count `{n}`.

type Others = Exclude<Language, 'pt-PT'>
export const defineMessages = <K extends string>(messages: { 'pt-PT': Record<K, string> } & { [L in Others]: Record<NoInfer<K>, string> }) => messages
