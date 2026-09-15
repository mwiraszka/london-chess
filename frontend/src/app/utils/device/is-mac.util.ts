/**
 * Check whether device is a Mac device (MacOS, iPhone, or iPad).
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // Modern approach first (but less supported)
  if (
    'userAgentData' in navigator &&
    navigator.userAgentData &&
    typeof navigator.userAgentData === 'object' &&
    'platform' in navigator.userAgentData
  ) {
    return navigator.userAgentData.platform === 'macOS';
  }

  // Fallback to traditional approach
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}
