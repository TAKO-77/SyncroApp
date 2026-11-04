const PHONE_QUERY = '(max-width:760px)'

/**
 * Stops pinch zoom on phones. Android follows the viewport tag and `touch-action` in `styles.css`, but Safari on
 * iPhone ignores the tag, so its gesture events are cancelled here.
 */
export function blockPhoneZoom() {
  const cancel = (e: Event) => { if (matchMedia(PHONE_QUERY).matches) e.preventDefault() }
  for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, cancel, { passive: false })
}
