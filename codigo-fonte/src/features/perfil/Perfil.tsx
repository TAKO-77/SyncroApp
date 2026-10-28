import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { sleepSchedule } from '../../lib/sleep'
import { mins } from '../../lib/dates'
import { Dashboard } from './Dashboard'
import { TimePicker } from '../../components/TimePicker'
import { Select } from '../../components/Select'

export function Perfil() {
  const { data, update } = useStore()
  const [name, setName] = useState(data.name ?? '')
  const [msg, setMsg] = useState('')
  const [syncDay, setSyncDay] = useState(0)
  const weekdays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
  const file = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const uploadPhoto = async (photo?: File) => {
    if (!photo) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) { setMsg('Escolhe uma imagem JPG, PNG ou WebP até 5 MB.'); return }
    setUploading(true)
    const url = URL.createObjectURL(photo)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const context = canvas.getContext('2d')
      if (!context) throw new Error()
      const side = Math.min(image.width, image.height)
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256)
      const result = canvas.toDataURL('image/jpeg', 0.85)
      update(d => { d.photo = result })
      setMsg('Foto de perfil guardada.')
    } catch { setMsg('Não foi possível carregar a imagem. Tenta outra foto.') }
    finally { URL.revokeObjectURL(url); setUploading(false) }
  }

  return (
    <section className="page narrow">
      <h2>Perfil</h2>
      <div className="profile-photo-row">
        {data.photo ? <img className="profile-photo" src={data.photo} alt="Foto de perfil" /> : <div className="profile-photo profile-placeholder" aria-label="Sem foto de perfil">{(data.name?.trim()[0] || '?').toUpperCase()}</div>}
        <div className="profile-photo-controls">
        <div className="acts">
          <button type="button" className="btn pri" disabled={uploading} onClick={() => file.current?.click()}>{uploading ? 'A carregar…' : data.photo ? 'Alterar foto' : 'Adicionar foto'}</button>
          {data.photo && <button className="btn" disabled={uploading} onClick={() => update(d => { delete d.photo })}>Remover foto</button>}
        </div>
        <small className="mu photo-help">JPG, PNG ou WebP, até 5 MB.</small>
        </div>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { void uploadPhoto(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p className="mu" role="status">{msg.startsWith('Horário') ? '' : msg}</p>
      <form className="row" onSubmit={e => { e.preventDefault(); update(d => { d.name = name.trim() }); setMsg('Guardado') }}>
        <label>Nome<input value={name} maxLength={24} onChange={e => setName(e.target.value)} required /></label>
        <button className="btn pri" type="submit">Guardar</button>
      </form>
      <h2 className="sub">Sono</h2>
      <p className="mu">Define a hora de deitar e de acordar para cada dia. As alterações ficam guardadas automaticamente.</p>
      <div className="sleep-week">
        <div className="sleep-row sleep-head" aria-hidden="true"><span>Dia</span><span>Deito-me</span><span>Acordo</span><span>Duração</span></div>
        {weekdays.map((day, index) => {
          const schedule = sleepSchedule(data.sleep, index)
          const duration = (mins(schedule.wake) - mins(schedule.bed) + 1440) % 1440
          return <div className={`sleep-row${index >= 5 ? ' weekend' : ''}`} key={day}>
            <strong title={day}>{day.slice(0, 3)}</strong>
            <TimePicker required aria-label={`Deito-me — ${day}`} value={schedule.bed} onChange={value => {
              if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return
              update(d => { const daily = weekdays.map((_, i) => ({ ...sleepSchedule(d.sleep, i) })); daily[index].bed = value; d.sleep.daily = daily })
            }} />
            <TimePicker required aria-label={`Acordo — ${day}`} value={schedule.wake} onChange={value => {
              if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return
              update(d => { const daily = weekdays.map((_, i) => ({ ...sleepSchedule(d.sleep, i) })); daily[index].wake = value; d.sleep.daily = daily })
            }} />
            <span className="sleep-duration">{duration ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${String(duration % 60).padStart(2, '0')}` : ''}` : '—'}</span>
          </div>
        })}
      </div>
      <div className="row sleep-sync">
        <label>Usar o horário de<Select value={syncDay} onChange={setSyncDay} options={weekdays.map((day, index) => ({ value: index, label: day }))} /></label>
        <button type="button" className="btn" onClick={() => {
          update(d => { const schedule = sleepSchedule(d.sleep, syncDay); d.sleep.daily = weekdays.map(() => ({ ...schedule })) })
          setMsg('Horário de sono aplicado a todos os dias.')
        }}>Aplicar a todos os dias</button>
      </div>
      <p className="mu" role="status">{msg.startsWith('Horário') ? msg : ''}</p>
      <h2 className="sub">Onde gasto o tempo</h2>
      <Dashboard />
    </section>
  )
}
