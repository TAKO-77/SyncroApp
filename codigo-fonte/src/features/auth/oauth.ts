import { anonKey, supabase, url } from '../../lib/supabase'
import { desktop } from '../../lib/desktop'

export type OAuthProvider = 'google'
export const OAUTH_PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: 'google', label: 'Google' },
]
// Loopback address served by desktop/Program.cs; must be in Supabase → Authentication → URL Configuration.
export const DESKTOP_REDIRECT = 'http://127.0.0.1:47821/auth/callback'

/** Providers enabled in the Supabase project; empty when offline so no dead buttons are shown. */
export async function enabledProviders(): Promise<typeof OAUTH_PROVIDERS> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
    if (!res.ok) return []
    const settings = await res.json() as { external?: Record<string, boolean> }
    return OAUTH_PROVIDERS.filter(p => settings.external?.[p.id] === true)
  } catch { return [] }
}

/**
 * Starts sign-in with a provider. In the browser the page is redirected and the session is read
 * from the URL on return. In the Windows app the provider page opens in the system browser,
 * because providers block embedded WebViews; the result arrives through `listenForDesktopOAuth`.
 */
export async function startOAuth(provider: OAuthProvider): Promise<{ error?: string; external?: boolean }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: desktop ? { redirectTo: DESKTOP_REDIRECT, skipBrowserRedirect: true } : { redirectTo: location.origin + location.pathname },
  })
  if (error) return { error: error.message }
  if (!desktop) return {}
  if (!data.url) return { error: 'missing_url' }
  desktop.postMessage('syncro:oauth-listen')
  window.open(data.url, '_blank')
  return { external: true }
}

/** Exchanges the code returned to the Windows app for a session. Returns a cleanup function. */
export function listenForDesktopOAuth(onError: (reason: string) => void): () => void {
  if (!desktop) return () => {}
  const bridge = desktop
  const onMessage = (event: MessageEvent) => {
    const payload = event.data as { type?: string; code?: string | null; error?: string | null } | null
    if (!payload || payload.type !== 'syncro:oauth') return
    if (!payload.code) { onError(payload.error ?? 'unknown'); return }
    void supabase.auth.exchangeCodeForSession(payload.code).then(({ error }) => { if (error) onError(error.code ?? error.message) })
  }
  bridge.addEventListener('message', onMessage)
  return () => bridge.removeEventListener('message', onMessage)
}

/** Error from a browser redirect (e.g. the user cancelled), read once from the URL. */
export function oauthRedirectError(): string | null {
  const params = new URLSearchParams(location.search + '&' + location.hash.slice(1))
  return params.get('error_description') ?? params.get('error')
}
