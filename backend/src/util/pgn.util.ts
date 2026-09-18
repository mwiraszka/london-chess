export interface ParsedPgn {
  tags: Record<string, string>;
  moves: string;
}

export interface ParsedPlayerName {
  firstName: string;
  lastName: string;
  suffix: string;
}

export interface ParsedPgnDate {
  year: number;
  date: string;
}

const TAG_PATTERN = /^\[(\w+)\s+"(.*)"\]\s*$/;

// Splits a PGN file into its games and each game into tags and movetext
export function parsePgnGames(text: string): ParsedPgn[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n(?=\[Event\s+")/)
    .map(parsePgnGame)
    .filter(game => Object.keys(game.tags).length > 0);
}

function parsePgnGame(text: string): ParsedPgn {
  const tags: Record<string, string> = {};
  const lines = text.split('\n');
  let index = 0;

  for (; index < lines.length; index++) {
    const match = lines[index].match(TAG_PATTERN);
    if (!match) {
      if (lines[index].trim() === '') {
        continue;
      }
      break;
    }
    tags[match[1]] = match[2];
  }

  const moves = lines.slice(index).join('\n').replace(/\s+/g, ' ').trim();

  return { tags, moves };
}

// The SAN moves alone, without move numbers, comments, variations or annotations
export function movetextTokens(moves: string): string[] {
  let depth = 0;
  let inComment = false;
  let stripped = '';

  for (const char of moves) {
    if (inComment) {
      inComment = char !== '}';
    } else if (char === '{') {
      inComment = true;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0) {
      stripped += char;
    }
  }

  return stripped
    .split(/\s+/)
    .filter(
      token =>
        token !== '' &&
        !/^\d+\.+$/.test(token) &&
        !/^\$\d+$/.test(token) &&
        !['1-0', '0-1', '1/2-1/2', '*'].includes(token),
    )
    .map(token => token.replace(/^\d+\.+/, ''));
}

// Player tags hold "Last, First" in several forms: a bare initial, a two-letter
// abbreviation, a full name, a suffix, a title, or stray text after a run of spaces
export function parsePlayerName(raw: string): ParsedPlayerName {
  const value = raw.trim();

  if (value === '' || value === '?') {
    return { firstName: '', lastName: 'Unknown', suffix: '' };
  }

  const dotted = value.match(/^([A-Z][A-Za-z' -]+)\.([A-Z])$/);
  if (dotted) {
    return { firstName: `${dotted[2]}.`, lastName: dotted[1], suffix: '' };
  }

  if (!value.includes(',')) {
    return { firstName: '', lastName: value, suffix: '' };
  }

  const [lastPart, firstPart] = value.split(/,(.*)/s);
  const lastName = lastPart.trim();
  let firstName = firstPart
    .split(/\s{2,}/)[0]
    .replace(/\([A-Z]+\)/g, '')
    .trim();
  let suffix = '';

  const suffixMatch = firstName.match(/^(.*?)\s+(Jr|Sr)\.?$/);
  if (suffixMatch) {
    firstName = suffixMatch[1];
    suffix = suffixMatch[2];
  }

  firstName = firstName.replace(/[.\s]+$/, '');

  if (/^[A-Z]{1,3}$/.test(firstName)) {
    firstName = `${firstName.split('').join('.')}.`;
  } else if (/^([A-Z]\.?\s?)+[A-Z]$/.test(firstName)) {
    firstName = `${firstName.replace(/[.\s]/g, '').split('').join('.')}.`;
  }

  return { firstName, lastName, suffix };
}

// PGN dates read YYYY.MM.DD with "??" for whatever was not recorded
export function parsePgnDate(value: string | undefined): ParsedPgnDate | null {
  const match = value?.match(/^(\d{4})\.(\d{2}|\?\?)\.(\d{2}|\?\?)$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parts = [year];
  if (month !== '??') {
    parts.push(month);
    if (day !== '??') {
      parts.push(day);
    }
  }

  return { year: Number(year), date: parts.join('-') };
}
