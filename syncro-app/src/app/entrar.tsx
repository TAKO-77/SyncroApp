import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { brand, spacing } from '@/lib/theme'

const logo = require('../../assets/images/syncro-icon.png')

type Mode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE = /^\d{6,10}$/
const MIN_PASSWORD = 8

// Same messages as the web app's AuthScreen.
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou palavra-passe incorretos.',
  user_already_exists: 'Já existe uma conta com este email. Inicia sessão.',
  weak_password: 'A palavra-passe é demasiado fraca.',
  otp_expired: 'O código expirou ou está incorreto. Pede um novo código.',
  over_email_send_rate_limit: 'Foram enviados demasiados emails. Tenta novamente daqui a alguns minutos.',
  over_request_rate_limit: 'Demasiadas tentativas. Aguarda um pouco e tenta novamente.',
}
const OFFLINE = 'Sem ligação ao servidor. Verifica a ligação à Internet.'
function describe(error: { code?: string; message: string; name?: string }) {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]
  if (error.name === 'AuthRetryableFetchError') return OFFLINE
  return 'Não foi possível concluir o pedido. Tenta novamente.'
}

const TITLES: Record<Mode, string> = { signin: 'Iniciar sessão', signup: 'Criar conta', confirm: 'Confirmar email', forgot: 'Recuperar palavra-passe', reset: 'Nova palavra-passe' }
const SUBMIT: Record<Mode, string> = { signin: 'Entrar', signup: 'Criar conta', confirm: 'Confirmar', forgot: 'Enviar código', reset: 'Guardar palavra-passe' }

export default function Entrar() {
  const { colors } = useTheme()
  const { configured } = useAuth()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const go = (next: Mode, message = '') => {
    setMode(next); setError(''); setInfo(message); setCode(''); setShowPassword(false)
    if (next !== 'signin' && next !== 'signup') setPassword('')
  }
  const needsPassword = mode === 'signin' || mode === 'signup' || mode === 'reset'
  const needsCode = mode === 'confirm' || mode === 'reset'

  const submit = async () => {
    const mail = email.trim().toLowerCase()
    if (mode !== 'reset' && !EMAIL.test(mail)) return setError('Indica um email válido.')
    if (needsPassword && password.length < MIN_PASSWORD) return setError(`A palavra-passe deve ter pelo menos ${MIN_PASSWORD} caracteres.`)
    if (needsCode && !CODE.test(code.trim())) return setError('Indica o código recebido por email.')
    setBusy(true); setError('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
        if (error?.code === 'email_not_confirmed') {
          await supabase.auth.resend({ type: 'signup', email: mail })
          return go('confirm', 'Confirma o teu email com o código que te enviámos.')
        }
        if (error) setError(describe(error))
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password })
        if (error) setError(describe(error))
        else if (!data.session) go('confirm', `Enviámos um código para ${mail}.`)
      } else if (mode === 'confirm') {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: 'email' })
        if (error) setError(describe(error))
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(mail)
        if (error) setError(describe(error))
        else go('reset', `Se existir uma conta para ${mail}, vais receber um código.`)
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: 'recovery' })
        if (error) return setError(describe(error))
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) setError(describe(updateError))
      }
    } catch {
      setError(OFFLINE)
    } finally { setBusy(false) }
  }

  const resend = async () => {
    setBusy(true); setError('')
    const mail = email.trim().toLowerCase()
    const { error } = mode === 'confirm' ? await supabase.auth.resend({ type: 'signup', email: mail }) : await supabase.auth.resetPasswordForEmail(mail)
    setBusy(false)
    if (error) setError(describe(error)); else setInfo('Enviámos um novo código.')
  }

  const eyeLabel = showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'
  const EyeIcon = showPassword ? EyeOff : Eye
  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: spacing.xl + insets.top, paddingBottom: spacing.xl + insets.bottom }]} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
          <AppText weight="bold" style={styles.wordmark}>SYNCRO</AppText>
        </View>
        <AppText variant="h3">{TITLES[mode]}</AppText>
        {!configured && <AppText tone="error" accessibilityRole="alert">Falta configurar o Supabase em syncro-app/.env (ver .env.example).</AppText>}
        {!!info && <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite">{info}</AppText>}
        {mode !== 'reset' && <TextField label="Email" value={email} onChangeText={setEmail} editable={mode !== 'confirm'}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" onSubmitEditing={() => void submit()} />}
        {needsCode && <TextField label="Código" value={code} onChangeText={v => setCode(v.replace(/\D/g, ''))} maxLength={10}
          keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" onSubmitEditing={() => void submit()} />}
        {needsPassword && <TextField label={mode === 'reset' ? 'Nova palavra-passe' : 'Palavra-passe'} value={password} onChangeText={setPassword}
          secureTextEntry={!showPassword} autoCapitalize="none" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          onSubmitEditing={() => void submit()}
          trailing={<Pressable accessibilityRole="button" accessibilityLabel={eyeLabel} hitSlop={8} onPress={() => setShowPassword(v => !v)}>
            <EyeIcon size={18} color={colors.muted} strokeWidth={1.5} />
          </Pressable>} />}
        {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
        <Button variant="primary" label={SUBMIT[mode]} busy={busy} disabled={!configured} onPress={() => void submit()} />
        <View style={styles.links}>
          {mode === 'signin' && <>
            <Button variant="ghost" label="Criar conta" onPress={() => go('signup')} />
            <Button variant="ghost" label="Esqueci-me da palavra-passe" onPress={() => go('forgot')} />
          </>}
          {mode === 'signup' && <Button variant="ghost" label="Já tenho conta" onPress={() => go('signin')} />}
          {needsCode && <Button variant="ghost" label="Reenviar código" disabled={busy} onPress={() => void resend()} />}
          {mode !== 'signin' && mode !== 'signup' && <Button variant="ghost" label="Voltar" onPress={() => go('signin')} />}
        </View>
      </Card>
    </ScrollView>
  </KeyboardAvoidingView>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  card: { width: '100%', maxWidth: 420, padding: spacing.lg, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  logo: { width: 36, height: 36 },
  wordmark: { color: brand.amber, fontSize: 20, lineHeight: 28, letterSpacing: 2 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
})
