import { randomInt } from 'node:crypto';

// Members copy the password from an email, so characters that are easy to misread
// (0 and O, 1, l and I) are left out
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const PASSWORD_LENGTH = 16;

export function generateTemporaryPassword(): string {
  const characters = [LOWERCASE, UPPERCASE, DIGITS].map(pickFrom);
  for (let index = characters.length; index < PASSWORD_LENGTH; index++) {
    characters.push(pickFrom(LOWERCASE + UPPERCASE + DIGITS));
  }

  for (let index = characters.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }
  return characters.join('');
}

function pickFrom(characterSet: string): string {
  return characterSet[randomInt(characterSet.length)];
}
