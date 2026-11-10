import { usePwa } from '../lib/pwa'
import { useT } from '../lib/i18n/useT'

// Shown in the web/PWA build when a new version has been downloaded. It only reloads if the user chooses to, so an open form is not lost.
export function UpdateBanner() {
  const { needRefresh, reload, dismiss } = usePwa()
  const { t } = useT()
  if (!needRefresh) return null
  return <div className="ov confirm-ov">
    <div className="dl confirm-dl" role="alertdialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-text">
      <h2 id="update-title">{t('app.update.title')}</h2>
      <p id="update-text" className="mu">{t('app.update.text')}</p>
      <div className="acts"><span className="sp" /><button type="button" className="btn" onClick={dismiss}>{t('app.update.later')}</button><button type="button" className="btn pri" autoFocus onClick={reload}>{t('app.update.reload')}</button></div>
    </div>
  </div>
}
