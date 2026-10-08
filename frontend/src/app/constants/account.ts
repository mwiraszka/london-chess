export const ACCOUNT_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
  { id: 'danger', label: 'Danger zone' },
] as const;

export const SESSION_REFRESH_INTERVAL_MS = 30_000;

// The API takes a photo up to this size, which leaves room within the request limit for
// the cropped copy sent with it
export const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

export const AVATAR_TYPES = 'image/jpeg,image/png,image/webp';
