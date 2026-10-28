import { useState } from 'react'
import { Linking, StyleSheet } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useAuth } from '@/hooks/useAuth'
import { useCloudData } from '@/hooks/useCloudData'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
]
const RELEASES = 'https://github.com/TAKO-77/SyncroApp/releases/latest'

export default function Definicoes() {
  const { preference, setPreference } = useTheme()
  const { user, signOut } = useAuth()
  const cloud = useCloudData()
  const [leaving, setLeaving] = useState(false)
  const status = cloud.state === 'loading' ? 'A carregar os dados…' : cloud.state === 'error' || cloud.error ? 'Sem ligação ao servidor.' : 'Ligado — as alterações são guardadas na conta.'

  return <Screen title="Definições" subtitle="Conta e preferências deste dispositivo.">
    <Card>
      <AppText weight="semibold">Conta</AppText>
      <AppText variant="caption" tone="muted">Sessão iniciada como {user?.email}.</AppText>
      <AppText variant="caption" tone={cloud.state === 'error' || cloud.error ? 'error' : 'muted'} accessibilityLiveRegion="polite">{status}</AppText>
      <Button label="Terminar sessão" variant="danger" busy={leaving} style={styles.start} onPress={() => { setLeaving(true); void signOut() }} />
    </Card>
    <Card>
      <AppText weight="semibold">Aparência</AppText>
      <AppText variant="caption" tone="muted">“Sistema” acompanha o modo claro ou escuro do dispositivo. Esta opção só se aplica a este dispositivo.</AppText>
      <SegmentedControl label="Tema" value={preference} options={THEMES} onChange={setPreference} />
    </Card>
    <Card>
      <AppText weight="semibold">Versão para Windows</AppText>
      <AppText variant="caption" tone="muted">As atualizações automáticas e a cópia de segurança (exportar e importar) continuam na aplicação Windows.</AppText>
      <Button label="Descarregar a versão mais recente" style={styles.start} onPress={() => void Linking.openURL(RELEASES)} />
    </Card>
  </Screen>
}

const styles = StyleSheet.create({
  start: { alignSelf: 'flex-start' },
})
