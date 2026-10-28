import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'

/** Temporary content for sections that are still to be migrated from the web app. */
export function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return <Screen title={title} subtitle={description}>
    <Card>
      <AppText weight="semibold">Em migração</AppText>
      <AppText variant="caption" tone="muted">Esta secção continua disponível na versão atual do Syncro e vai ser trazida para aqui.</AppText>
    </Card>
  </Screen>
}
