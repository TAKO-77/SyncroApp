import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'

void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const { scheme, colors } = useTheme()
  const { ready, user } = useAuth()
  useEffect(() => { if (ready) void SplashScreen.hideAsync() }, [ready])
  if (!ready) return null
  return <>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="entrar" />
      </Stack.Protected>
    </Stack>
  </>
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  if (!loaded && !error) return null
  return <SafeAreaProvider>
    <ThemeProvider>
      <AuthProvider><RootNavigator /></AuthProvider>
    </ThemeProvider>
  </SafeAreaProvider>
}
