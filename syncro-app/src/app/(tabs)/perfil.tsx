import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LoadState } from '@/components/LoadState'
import { Notice } from '@/components/Notice'
import { Screen } from '@/components/Screen'
import { SleepWeek } from '@/components/SleepWeek'
import { TextField } from '@/components/TextField'
import { TimeUsage } from '@/components/TimeUsage'
import { useCloudData } from '@/hooks/useCloudData'
import { pickProfilePhoto } from '@/lib/photo'
import { NAME_MAX, validateName } from '@/lib/profile'
import { spacing } from '@/lib/theme'

export default function Perfil() {
  const cloud = useCloudData()
  const { profile, events, eventCategories } = cloud.data
  const [name, setName] = useState(profile.name)
  const [message, setMessage] = useState('')
  const [nameError, setNameError] = useState('')
  const [uploading, setUploading] = useState(false)
  // Show the name from the server once it loads (or changes on another device) unless it is being edited.
  const [editingName, setEditingName] = useState(false)
  useEffect(() => { if (!editingName) setName(profile.name) }, [profile.name, editingName])

  const saveName = () => {
    const result = validateName(name)
    if (!result.ok) return setNameError(result.error)
    cloud.saveProfile({ ...profile, name: result.value }, 'Não foi possível guardar o nome.')
    setEditingName(false); setNameError(''); setMessage('Nome guardado.')
  }
  const changePhoto = async () => {
    setUploading(true); setMessage('')
    try {
      const photo = await pickProfilePhoto()
      if (photo) { cloud.saveProfile({ ...profile, photo }, 'Não foi possível guardar a foto.'); setMessage('Foto de perfil guardada.') }
    } catch {
      setMessage('Não foi possível carregar a imagem. Tenta outra foto.')
    } finally { setUploading(false) }
  }

  return <Screen title="Perfil">
    <Notice message={cloud.error} onDismiss={cloud.dismissError} />
    <Notice message={message} tone="info" onDismiss={() => setMessage('')} />
    {cloud.state !== 'ready' ? <LoadState state={cloud.state} what="o perfil" onRetry={cloud.retry} /> : <>
      <Card>
        <View style={styles.photoRow}>
          <Avatar photo={profile.photo} name={profile.name} size={88} />
          <View style={styles.photoActions}>
            <View style={styles.buttons}>
              <Button label={profile.photo ? 'Alterar foto' : 'Adicionar foto'} variant="primary" busy={uploading} onPress={() => void changePhoto()} />
              {!!profile.photo && <Button label="Remover foto" disabled={uploading} onPress={() => { cloud.saveProfile({ ...profile, photo: '' }, 'Não foi possível remover a foto.'); setMessage('Foto removida.') }} />}
            </View>
            <AppText variant="caption" tone="muted">A foto é recortada em quadrado e reduzida.</AppText>
          </View>
        </View>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <TextField label="Nome" value={name} maxLength={NAME_MAX} onFocus={() => setEditingName(true)}
              onChangeText={v => { setName(v); setNameError('') }} onSubmitEditing={saveName} />
          </View>
          <Button label="Guardar" variant="primary" onPress={saveName} />
        </View>
        {!!nameError && <AppText variant="caption" tone="error" accessibilityRole="alert">{nameError}</AppText>}
      </Card>
      <SleepWeek sleep={profile.sleep} onChange={(sleep, done) => { cloud.saveProfile({ ...profile, sleep }, 'Não foi possível guardar o horário de sono.'); if (done) setMessage(done) }} />
      <TimeUsage events={events} categories={eventCategories} sleep={profile.sleep} />
    </>}
  </Screen>
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  photoActions: { gap: spacing.xs, flexShrink: 1 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  nameField: { flex: 1, maxWidth: 360 },
})
