import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { Dashboard } from './Dashboard'
import { SleepSettings } from './SleepSettings'
import { NotifyChoice } from './NotifyChoice'

export function Perfil() {
  const { data, update } = useStore()
  const [name, setName] = useState(data.name ?? '')
  const [msg, setMsg] = useState('')
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
      <p className="mu" role="status">{msg}</p>
      <form className="row profile-name" onSubmit={e => { e.preventDefault(); update(d => { d.name = name.trim() }); setMsg('Guardado') }}>
        <label>Nome<input value={name} maxLength={24} onChange={e => setName(e.target.value)} required /></label>
        <button className="btn pri" type="submit">Guardar</button>
      </form>
      <NotifyChoice />
      <SleepSettings />
      <h2 className="sub">Onde gasto o tempo</h2>
      <Dashboard />
    </section>
  )
}
