import { Glider } from '../../components/Glider'
import { useStore } from '../../store/useStore'

/** What notifies, for the whole account; whether this device receives notifications at all is in Definições. */
export function NotifyChoice() {
  const { data, update } = useStore()
  const choose = (notifyTasks: boolean) => update(d => { d.notifyTasks = notifyTasks })
  return <>
    <h2 className="sub">Notificações</h2>
    <div className="seg notify-choice" role="group" aria-label="Receber notificações de">
      <button type="button" aria-pressed={!data.notifyTasks} onClick={() => choose(false)}>Só lembretes</button>
      <button type="button" aria-pressed={data.notifyTasks} onClick={() => choose(true)}>Lembretes e tarefas</button>
      <Glider />
    </div>
    <p className="mu">Aplica-se a todos os teus dispositivos. Para ligar ou desligar os avisos neste dispositivo, vai a Definições.</p>
  </>
}
