import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'

void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const { scheme, colors } = useTheme()
  return <>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  </>
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync() }, [loaded, error])
  if (!loaded && !error) return null
  return <SafeAreaProvider>
    <ThemeProvider><RootNavigator /></ThemeProvider>
  </SafeAreaProvider>
}
