// The start-up logo lives in index.html, outside React, so it is on screen from the first paint and stays put across the loading phases.
const splash = () => document.getElementById('splash')

/** Brings the logo back, for example while the data loads after signing in, and plays it again. */
export function showSplash() {
  const el = splash()
  if (!el?.classList.contains('out')) return
  el.classList.remove('out')
  // Passing through display:none is what restarts a CSS animation, and it skips the fade.
  el.style.display = 'none'
  void el.offsetWidth
  el.style.display = ''
}

/** Fades into whatever is rendered underneath. */
export function hideSplash() {
  splash()?.classList.add('out')
}

/**
 * Resolves when the last blade has landed, or straight away when there is nothing to wait for (reduced motion).
 * A page that isn't being drawn, like a window hidden in the tray, doesn't advance its animations, so the wait is also capped by the clock: the app must not depend on frames to open.
 */
export function splashLanded() {
  const blades = splash()?.getAnimations({ subtree: true }).filter(animation => animation instanceof CSSAnimation) ?? []
  if (!blades.length) return Promise.resolve()
  const end = Math.max(...blades.map(blade => Number(blade.effect?.getComputedTiming().endTime ?? 0)))
  return Promise.race([
    Promise.allSettled(blades.map(blade => blade.finished)).then(() => undefined),
    new Promise<void>(resolve => { setTimeout(resolve, end) }),
  ])
}
