const REGIONAL_INDICATOR_A = 0x1f1e6;
const BLACK_FLAG = 0x1f3f4;
const TAG_BASE = 0xe0000;
const CANCEL_TAG = 0xe007f;

/**
 * The flag emoji for an ISO 3166 code: a country's two letters (`'ca'`) as a pair of
 * regional indicators, or a region within one (`'gb-eng'`) as tag characters on a black
 * flag.
 */
export function flagEmoji(code: string): string {
  const [country, region] = code.toLowerCase().split('-');
  if (!region) {
    return String.fromCodePoint(
      ...[...country].map(letter => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 97),
    );
  }
  return String.fromCodePoint(
    BLACK_FLAG,
    ...[...(country + region)].map(char => TAG_BASE + char.charCodeAt(0)),
    CANCEL_TAG,
  );
}
