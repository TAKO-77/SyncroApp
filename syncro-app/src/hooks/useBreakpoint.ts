import { useWindowDimensions } from 'react-native'
import { breakpoints } from '@/lib/theme'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions()
  if (width > breakpoints.desktop) return 'desktop'
  if (width >= breakpoints.tablet) return 'tablet'
  return 'mobile'
}
