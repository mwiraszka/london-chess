import { dataUrlToFile } from './data-url-to-file.util';

const MOCK_DATA_URL = 'data:image/png;base64,VEhJUyBJUyBUSEUgQU5TV0VSCg==';
const MOCK_FILENAME = 'my-file.png';

describe('dataUrlToFile', () => {
  it('returns `null` if `undefined`, `null` or invalid data URL provided', () => {
    expect(dataUrlToFile(undefined, MOCK_FILENAME)).toBe(null);
    expect(dataUrlToFile(null, MOCK_FILENAME)).toBe(null);
    expect(dataUrlToFile('', MOCK_FILENAME)).toBe(null);
    expect(dataUrlToFile('$', MOCK_FILENAME)).toBe(null);
    expect(dataUrlToFile('invalid', MOCK_FILENAME)).toBe(null);
  });

  it('returns `null` if `filename` is `null` or `undefined`', () => {
    expect(dataUrlToFile(MOCK_DATA_URL, undefined)).toBe(null);
    expect(dataUrlToFile(MOCK_DATA_URL, null)).toBe(null);
  });

  it('retains filename after conversion', () => {
    const file = dataUrlToFile(MOCK_DATA_URL, MOCK_FILENAME);

    expect(file?.name).toBe('my-file.png');
  });
});
