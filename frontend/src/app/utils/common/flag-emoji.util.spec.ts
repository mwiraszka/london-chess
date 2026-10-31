import { flagEmoji } from './flag-emoji.util';

describe('flagEmoji', () => {
  it("gives a country's flag", () => {
    expect(flagEmoji('ca')).toBe('🇨🇦');
    expect(flagEmoji('no')).toBe('🇳🇴');
  });

  it("gives a region's flag", () => {
    expect(flagEmoji('gb-eng')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
    expect(flagEmoji('gb-sct')).toBe('🏴󠁧󠁢󠁳󠁣󠁴󠁿');
  });
});
