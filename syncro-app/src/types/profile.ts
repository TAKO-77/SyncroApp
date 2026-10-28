export interface SleepSchedule { bed: string; wake: string }

/** Stored as JSON in `profiles.sleep`; fields this app doesn't know are kept when saving. */
export interface Sleep {
  /** One schedule per weekday (Monday first) once the user has edited them. */
  daily?: SleepSchedule[]
  bed: string
  wake: string
  wk: boolean
  bed2: string
  wake2: string
  [key: string]: unknown
}

export interface Profile {
  readonly name: string
  /** `data:image/...;base64,...`, or '' for none. */
  readonly photo: string
  readonly sleep: Sleep
  readonly reset: string
}

export interface TimeSlice { id: string; name: string; color: string; value: number }
