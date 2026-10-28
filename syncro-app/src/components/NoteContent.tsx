import { Check } from 'lucide-react-native'
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { parseNote, type Inline } from '@/lib/notes'
import { fonts, radius, spacing } from '@/lib/theme'

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Consolas, monospace' })

function InlineText({ parts }: { parts: Inline[] }) {
  const { colors } = useTheme()
  return <>{parts.map((p, i) => {
    switch (p.kind) {
      case 'bold': return <Text key={i} style={{ fontFamily: fonts.semibold }}>{p.text}</Text>
      case 'italic': return <Text key={i} style={styles.italic}>{p.text}</Text>
      case 'code': return <Text key={i} style={[styles.code, { backgroundColor: colors.surfaceRaised }]}>{p.text}</Text>
      case 'link': return <Text key={i} accessibilityRole="link" style={[styles.link, { color: colors.accent }]} onPress={() => void Linking.openURL(p.href)}>{p.text}</Text>
      default: return <Text key={i}>{p.text}</Text>
    }
  })}</>
}

/** Renders a note's markdown subset; tapping a task line ticks it via `onToggle(lineIndex)`. */
export function NoteContent({ text, onToggle }: { text: string; onToggle: (lineIndex: number) => void }) {
  const { colors } = useTheme()
  return <View style={styles.body}>{parseNote(text).map((line, i) => {
    switch (line.kind) {
      case 'gap': return <View key={i} style={styles.gap} />
      case 'heading': return <AppText key={i} weight="semibold" style={styles.heading}><InlineText parts={line.content} /></AppText>
      case 'quote': return <View key={i} style={[styles.quote, { borderLeftColor: colors.border }]}><AppText tone="muted"><InlineText parts={line.content} /></AppText></View>
      case 'bullet': return <View key={i} style={styles.item}><AppText tone="muted">•</AppText><AppText style={styles.grow}><InlineText parts={line.content} /></AppText></View>
      case 'numbered': return <View key={i} style={styles.item}><AppText tone="muted">{line.number}.</AppText><AppText style={styles.grow}><InlineText parts={line.content} /></AppText></View>
      case 'task': return <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: line.done }} onPress={() => onToggle(i)} style={styles.item}>
        <View style={[styles.box, { borderColor: line.done ? colors.success : colors.muted, backgroundColor: line.done ? colors.success : 'transparent' }]}>
          {line.done && <Check size={12} color={colors.onAccent} strokeWidth={3} />}
        </View>
        <AppText style={[styles.grow, line.done && { textDecorationLine: 'line-through', color: colors.muted }]}><InlineText parts={line.content} /></AppText>
      </Pressable>
      default: return <AppText key={i}><InlineText parts={line.content} /></AppText>
    }
  })}</View>
}

const styles = StyleSheet.create({
  body: { gap: 2 },
  gap: { height: spacing.sm },
  heading: { fontSize: 18, lineHeight: 26 },
  quote: { borderLeftWidth: 3, paddingLeft: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  grow: { flex: 1 },
  box: { width: 18, height: 18, marginTop: 3, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: MONO, fontSize: 14, borderRadius: radius.sm },
  link: { textDecorationLine: 'underline' },
})
