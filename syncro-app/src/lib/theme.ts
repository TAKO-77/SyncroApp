// Design tokens from docs/DESIGN_SYSTEM.md. Never use colours outside this palette.

export type ColorScheme = 'dark' | 'light'

export interface Palette {
  background: string
  surface: string
  surfaceRaised: string
  accent: string
  onAccent: string
  accentSoft: string
  text: string
  muted: string
  border: string
  success: string
  error: string
}

export const palettes: Record<ColorScheme, Palette> = {
  dark: {
    background: '#1C1E1E',
    surface: '#222424',
    surfaceRaised: '#2A2C2C',
    accent: '#EFCB53',
    onAccent: '#1C1E1E',
    accentSoft: 'rgba(239,203,83,0.12)',
    text: '#F3F4F6',
    muted: '#A4A7A7',
    border: '#343636',
    success: '#22C55E',
    error: '#EF4444',
  },
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceRaised: '#F3F4F6',
    accent: '#745C00',
    onAccent: '#FFFFFF',
    accentSoft: 'rgba(116,92,0,0.10)',
    text: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    success: '#16A34A',
    error: '#DC2626',
  },
}

export const brand = { amber: '#FFB020', centre: '#FFE4A3' } as const

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 } as const

export const radius = { sm: 8, md: 12, pill: 999 } as const

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const

export const typography = {
  h1: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56 },
  h2: { fontFamily: fonts.semibold, fontSize: 36, lineHeight: 44 },
  h3: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 32 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
} as const

export type TextVariant = keyof typeof typography

/** Breakpoints: mobile under 640px, tablet 640–1024px, desktop over 1024px. */
export const breakpoints = { tablet: 640, desktop: 1024 } as const
