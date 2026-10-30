export const MIN_YEAR_OF_BIRTH = 1900;

// Must match UNRATED in the backend's rating util
export const UNRATED = 'unrated';

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
  fideId: {
    pattern: /^\d{1,10}$/,
    message: 'FIDE ID must be a number of up to 10 digits',
  },
  cfcId: {
    pattern: /^\d{1,7}$/,
    message: 'CFC ID must be a number of up to 7 digits',
  },
} as const;
