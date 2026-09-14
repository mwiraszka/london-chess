export const MIN_YEAR_OF_BIRTH = 1900;

// Must match MEMBER_DETAIL_RULES in the backend's users controller
export const MEMBER_DETAIL_RULES = {
  phoneNumber: {
    pattern: /^[0-9()+\-. ]{7,20}$/,
    message:
      'Phone number must be 7 to 20 characters using digits, spaces, and ()+-. only.',
  },
  lichessUsername: {
    pattern: /^[a-zA-Z0-9_-]{2,20}$/,
    message:
      'Lichess username must be 2 to 20 letters, numbers, hyphens, or underscores.',
  },
  chessComUsername: {
    pattern: /^[a-zA-Z0-9_-]{3,25}$/,
    message:
      'Chess.com username must be 3 to 25 letters, numbers, hyphens, or underscores.',
  },
} as const;
