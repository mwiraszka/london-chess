/**
 * Check whether the current device has a touch screen.
 * Uses the MediaQueryList API to detect devices with coarse pointer capabilities.
 */
export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}
