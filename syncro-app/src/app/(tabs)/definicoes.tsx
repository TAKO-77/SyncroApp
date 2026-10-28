import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
]

export default function Definicoes() {
  const { preference, setPreference } = useTheme()
  return <Screen title="Definições" subtitle="Preferências deste dispositivo.">
    <Card>
      <AppText weight="semibold">Tema</AppText>
      <AppText variant="caption" tone="muted">“Sistema” acompanha o modo claro ou escuro do dispositivo.</AppText>
      <SegmentedControl label="Tema" value={preference} options={THEMES} onChange={setPreference} />
    </Card>
  </Screen>
}
