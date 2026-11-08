import { isPhone } from './media'

/**
 * Stops pinch zoom on phones. Android follows the viewport tag and `touch-action` in `styles.css`, but Safari on
 * iPhone ignores the tag, so its gesture events are cancelled here.
 */
export function blockPhoneZoom() {
  const cancel = (e: Event) => { if (isPhone()) e.preventDefault() }
  for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, cancel, { passive: false })
}
