// Shared secondary colours: gold, sage, slate and clay, with neutral support.
export const PALETTE = {
  gold: '#d2bd62', sage: '#8bb08b', slate: '#9fb0c0', clay: '#cf7f7f',
  neutral: '#a4a7a7', muted: '#6b7280', success: '#22c55e', error: '#ef4444',
} as const

/** Fixed expense categories used by Finanças and Início. */
export const FIN_CATS = [{ id: 'alim', name: 'Alimentação', color: PALETTE.gold }, { id: 'transp', name: 'Transportes', color: PALETTE.slate }, { id: 'casa', name: 'Casa', color: PALETTE.gold }, { id: 'saude', name: 'Saúde', color: PALETTE.sage }, { id: 'lazer', name: 'Lazer', color: PALETTE.clay }, { id: 'compras', name: 'Compras', color: PALETTE.sage }, { id: 'educ', name: 'Educação', color: PALETTE.clay }, { id: 'subs', name: 'Subscrições', color: PALETTE.sage }, { id: 'viag', name: 'Viagens', color: PALETTE.slate }, { id: 'outros', name: 'Outros', color: PALETTE.neutral }]
export const finCat = (id: string) => FIN_CATS.find(c => c.id === id) ?? FIN_CATS[FIN_CATS.length - 1]

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
