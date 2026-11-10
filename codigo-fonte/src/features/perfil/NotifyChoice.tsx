import { Glider } from '../../components/Glider'
import { useStore } from '../../store/useStore'
import { useT } from '../../lib/i18n/useT'

/** What notifies, for the whole account; whether this device receives notifications at all is in Definições. */
export function NotifyChoice() {
  const { data, update } = useStore()
  const { t } = useT()
  const choose = (notifyTasks: boolean) => update(d => { d.notifyTasks = notifyTasks })
  return <>
    <h2 className="sub">{t('perfil.notifications')}</h2>
    <div className="seg notify-choice" role="group" aria-label={t('perfil.notifyGroup')}>
      <button type="button" aria-pressed={!data.notifyTasks} onClick={() => choose(false)}>{t('perfil.remindersOnly')}</button>
      <button type="button" aria-pressed={data.notifyTasks} onClick={() => choose(true)}>{t('perfil.remindersAndTasks')}</button>
      <Glider />
    </div>
    <p className="mu">{t('perfil.notifyHelp')}</p>
  </>
}
