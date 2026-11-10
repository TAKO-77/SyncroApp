import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useT } from '../../lib/i18n/useT'
import { Dashboard } from './Dashboard'
import { NotifyChoice } from './NotifyChoice'
import { Avatar } from './Avatar'
import { IMAGE_ACCEPT, drawImage, isAcceptedImage } from '../../lib/images'

const PHOTO_SIDE = 256

export function Perfil() {
  const { data, update } = useStore()
  const { t } = useT()
  const [name, setName] = useState(data.name ?? '')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const uploadPhoto = async (photo?: File) => {
    if (!photo) return
    if (!isAcceptedImage(photo, 5)) { setMsg(t('perfil.badImage')); return }
    setUploading(true)
    try {
      // A centred square, so the round frame never stretches the face.
      const canvas = await drawImage(photo, (width, height) => {
        const side = Math.min(width, height)
        return { width: PHOTO_SIDE, height: PHOTO_SIDE, source: [(width - side) / 2, (height - side) / 2, side, side] }
      })
      const result = canvas.toDataURL('image/jpeg', 0.85)
      update(d => { d.photo = result })
      setMsg(t('perfil.photoSaved'))
    } catch { setMsg(t('perfil.imageFailed')) }
    finally { setUploading(false) }
  }

  return (
    <section className="page narrow">
      <h2>{t('perfil.title')}</h2>
      <div className="profile-photo-row">
        <Avatar className="profile-photo" alt={t('perfil.photoAlt')} />
        <div className="profile-photo-controls">
        <div className="acts">
          <button type="button" className="btn pri" disabled={uploading} onClick={() => file.current?.click()}>{t(uploading ? 'perfil.loading' : data.photo ? 'perfil.changePhoto' : 'perfil.addPhoto')}</button>
          {data.photo && <button className="btn" disabled={uploading} onClick={() => update(d => { delete d.photo })}>{t('perfil.removePhoto')}</button>}
        </div>
        <small className="mu photo-help">{t('perfil.photoHelp')}</small>
        </div>
        <input ref={file} type="file" accept={IMAGE_ACCEPT} hidden onChange={e => { void uploadPhoto(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p className="mu" role="status">{msg}</p>
      <form className="row profile-name" onSubmit={e => { e.preventDefault(); update(d => { d.name = name.trim() }); setMsg(t('perfil.saved')) }}>
        <label>{t('perfil.name')}<input value={name} maxLength={24} onChange={e => setName(e.target.value)} required /></label>
        <button className="btn pri" type="submit">{t('perfil.save')}</button>
      </form>
      <NotifyChoice />
      <h2 className="sub">{t('perfil.timeTitle')}</h2>
      <Dashboard />
    </section>
  )
}
