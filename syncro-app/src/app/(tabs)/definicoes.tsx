import { useState } from 'react'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useAuth } from '@/hooks/useAuth'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
]

export default function Definicoes() {
  const { preference, setPreference } = useTheme()
  const { user, signOut } = useAuth()
  const [leaving, setLeaving] = useState(false)
  return <Screen title="Definições" subtitle="Preferências deste dispositivo.">
    <Card>
      <AppText weight="semibold">Tema</AppText>
      <AppText variant="caption" tone="muted">“Sistema” acompanha o modo claro ou escuro do dispositivo.</AppText>
      <SegmentedControl label="Tema" value={preference} options={THEMES} onChange={setPreference} />
    </Card>
    <Card>
      <AppText weight="semibold">Conta</AppText>
      <AppText variant="caption" tone="muted">Sessão iniciada como {user?.email}.</AppText>
      <Button label="Terminar sessão" variant="danger" busy={leaving} style={{ alignSelf: 'flex-start' }}
        onPress={() => { setLeaving(true); void signOut() }} />
    </Card>
  </Screen>
}
