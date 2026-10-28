/** Category of agenda events (`event_categories`) or of special days (`day_categories`). */
export interface Category {
  readonly id: string
  readonly name: string
  /** `#rrggbb`. */
  readonly color: string
  /** One emoji; only day categories have one, '' when unset. */
  readonly icon: string
  readonly position: number
}
