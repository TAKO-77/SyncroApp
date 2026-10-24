// Shared secondary colours: gold, sage, slate and clay, with neutral support.
export const PALETTE = {
  gold: '#d2bd62', sage: '#8bb08b', slate: '#9fb0c0', clay: '#cf7f7f',
  neutral: '#a4a7a7', muted: '#6b7280', success: '#22c55e', error: '#ef4444',
} as const

const legacy: Record<string, { previous: string; current: string }> = {
  autonomo: { previous: '#d89d5f', current: PALETTE.gold },
  projetos: { previous: '#7f9fc9', current: PALETTE.slate },
  exercicio: { previous: '#a692cc', current: PALETTE.sage },
  lazer: { previous: '#c98fb3', current: PALETTE.clay },
}
export function harmonizeDefaultColor(id: string, color: string): string {
  const entry = legacy[id]
  return entry && color.toLowerCase() === entry.previous ? entry.current : color
}
