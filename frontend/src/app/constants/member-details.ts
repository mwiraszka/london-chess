export const MIN_YEAR_OF_BIRTH = 1900;

// Must match MEMBER_DETAIL_RULES in the backend's users controller
export const MEMBER_DETAIL_RULES = {
  phoneNumber: {
    pattern: /^(?:(?:\+1|001) ?)?(?:\d{3}-\d{3}-\d{4}|\d{10}|\(\d{3}\) \d{3}[- ]?\d{4})$/,
    message: 'Please enter a valid phone number',
  },
  lichessUsername: {
    pattern: /^[a-zA-Z0-9_-]{2,20}$/,
    message: 'Lichess username must be 2 to 20 letters, numbers, hyphens, or underscores',
  },
  chessComUsername: {
    pattern: /^[a-zA-Z0-9_-]{3,25}$/,
    message:
      'Chess.com username must be 3 to 25 letters, numbers, hyphens, or underscores',
  },
} as const;
