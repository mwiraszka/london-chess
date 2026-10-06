/**
 * The behaviour for a scroll the app starts: smooth, unless the visitor's system asks for
 * less motion, in which case it jumps straight there.
 */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}
