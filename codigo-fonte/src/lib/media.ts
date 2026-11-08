/** The phone layout; the same breakpoint as the 760px block in `styles.css`. */
export const PHONE_QUERY = '(max-width:760px)'
export const isPhone = () => matchMedia(PHONE_QUERY).matches
/** JS-driven motion checks this itself; CSS animations are shortened by a global rule. */
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
