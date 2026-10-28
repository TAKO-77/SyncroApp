/** Birthday, exam, trip… shown on the Calendário and at the top of the Agenda. */
export interface SpecialDay {
  readonly id: string
  readonly name: string
  readonly categoryId: string
  readonly start: string
  /** Last day (ISO), or '' for a single day. Always '' when `yearly`. */
  readonly end: string
  /** `HH:MM`, or ''. */
  readonly time: string
  readonly notes: string
  readonly yearly: boolean
  readonly position: number
}

export type SpecialDayDraft = Omit<SpecialDay, 'id' | 'position'>
