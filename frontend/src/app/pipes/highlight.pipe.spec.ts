import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  let pipe: HighlightPipe;
  let sanitizer: Mocked<DomSanitizer>;

  beforeEach(() => {
    sanitizer = {
      sanitize: vi.fn(),
      // Add other required methods as mocks if needed
      sanitizeStyle: vi.fn(),
      sanitizeUrl: vi.fn(),
      sanitizeScript: vi.fn(),
      sanitizeResourceUrl: vi.fn(),
      sanitizeHtml: vi.fn(),
      bypassSecurityTrustHtml: vi.fn((value: string) => {
        // Return a mock SafeHtml object that includes the string value
        return {
          changingThisBreaksApplicationSecurity: value,
          toString: () => value,
        } as SafeHtml;
      }),
      bypassSecurityTrustStyle: vi.fn(),
      bypassSecurityTrustScript: vi.fn(),
      bypassSecurityTrustUrl: vi.fn(),
      bypassSecurityTrustResourceUrl: vi.fn(),
    } as Mocked<DomSanitizer>;

    pipe = new HighlightPipe(sanitizer);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null or undefined values', () => {
    expect(pipe.transform(null, 'search')).toBe('');
    expect(pipe.transform(undefined, 'search')).toBe('');
  });

  it('should return original text when search query is empty or undefined', () => {
    expect(pipe.transform('Hello World', '')).toBe('Hello World');
    expect(pipe.transform('Hello World', '   ')).toBe('Hello World');
    expect(pipe.transform('Hello World', undefined)).toBe('Hello World');
  });

  it('should highlight matching text case-insensitively', () => {
    const result = pipe.transform('John Doe', 'john');
    expect(result.toString()).toBe('<mark class="lcc-search-highlight">John</mark> Doe');
  });

  it('should highlight multiple occurrences', () => {
    const result = pipe.transform('To be or not to be', 'to be');
    const resultString = result.toString();

    const firstMatch = '<mark class="lcc-search-highlight">To be</mark>';
    const secondMatch = '<mark class="lcc-search-highlight">to be</mark>';

    expect(resultString).toBe(`${firstMatch} or not ${secondMatch}`);
  });

  it('should handle special regex characters', () => {
    const result = pipe.transform('user@example.com', 'user@');
    expect(result.toString()).toBe(
      '<mark class="lcc-search-highlight">user@</mark>example.com',
    );
  });

  it('should highlight partial matches', () => {
    const result = pipe.transform('Johnson', 'john');
    expect(result.toString()).toBe('<mark class="lcc-search-highlight">John</mark>son');
  });
});
