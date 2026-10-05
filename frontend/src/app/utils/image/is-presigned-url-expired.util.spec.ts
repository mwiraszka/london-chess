import { isPresignedUrlExpired } from './is-presigned-url-expired.util';

describe('isPresignedUrlExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
  });

  it('should treat a URL with no recorded expiration as expired', () => {
    expect(isPresignedUrlExpired(null)).toBe(true);
    expect(isPresignedUrlExpired(undefined)).toBe(true);
  });

  it('should treat a URL as expired once it is within two hours of expiring', () => {
    expect(isPresignedUrlExpired('2026-10-05T11:00:00.000Z')).toBe(true);
    expect(isPresignedUrlExpired('2026-10-05T13:59:00.000Z')).toBe(true);
  });

  it('should keep a URL that has more than two hours left', () => {
    expect(isPresignedUrlExpired('2026-10-05T14:01:00.000Z')).toBe(false);
    expect(isPresignedUrlExpired('2026-10-05T23:00:00.000Z')).toBe(false);
  });
});
