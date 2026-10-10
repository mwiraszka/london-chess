import { hashSecret } from './hash-secret.util';

describe('hashSecret', () => {
  it('should hash a secret the same way every time, and no two secrets alike', () => {
    const hash = hashSecret('Temp4Pass');
    const sameHash = hashSecret('Temp4Pass');
    const otherHash = hashSecret('Temp4Pass2');

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sameHash).toBe(hash);
    expect(otherHash).not.toBe(hash);
  });
});
