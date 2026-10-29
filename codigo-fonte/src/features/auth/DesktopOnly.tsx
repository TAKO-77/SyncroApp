import { LogoFilter } from '../../components/common'
const syncroLogo = new URL('../../assets/syncro-logo.png', import.meta.url).href

// Shown instead of the app when the UI is opened outside the Windows host.
export function DesktopOnly() {
  return <main className="auth">
    <LogoFilter />
    <section className="auth-card" aria-labelledby="desktop-only-title">
      <img className="auth-logo" src={syncroLogo} alt="Syncro" />
      <h2 id="desktop-only-title">Abre o Syncro no computador</h2>
      <p className="mu">O Syncro só funciona através da aplicação para Windows. Instala-a ou abre-a a partir do atalho no ambiente de trabalho.</p>
      <a className="btn pri" href="https://github.com/TAKO-77/SyncroApp/releases/latest" target="_blank" rel="noreferrer">Transferir o Syncro</a>
    </section>
  </main>
}
