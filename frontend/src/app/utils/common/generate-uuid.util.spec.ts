import { generateUuid } from './generate-uuid.util';

describe('generateUuid', () => {
  it('generates a valid UUID v4 format', () => {
    const uuid = generateUuid();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(uuid)).toBeTruthy();
  });

  it('generates unique UUIDs on subsequent calls', () => {
    const uuid1 = generateUuid();
    const uuid2 = generateUuid();
    const uuid3 = generateUuid();

    expect(uuid1).not.toBe(uuid2);
    expect(uuid2).not.toBe(uuid3);
    expect(uuid1).not.toBe(uuid3);
  });

  it('has correct length of 36 characters', () => {
    const uuid = generateUuid();

    expect(uuid.length).toBe(36);
  });

  it('has version 4 indicator in the correct position', () => {
    const uuid = generateUuid();

    expect(uuid.charAt(14)).toBe('4');
  });

  it('has variant bits set correctly', () => {
    const uuid = generateUuid();
    const variantChar = uuid.charAt(19);

    expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase());
  });
});
