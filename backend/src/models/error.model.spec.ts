import { isLccError } from './error.model';

describe('isLccError', () => {
  it('should recognise only objects shaped like an LCC error', () => {
    const lccError = { name: 'LCCError', message: 'Failed', status: 500 };

    expect(isLccError(lccError)).toBe(true);
    expect(isLccError({ ...lccError, name: 'Error' })).toBe(false);
    expect(isLccError({ name: 'LCCError', message: 'Failed' })).toBe(false);
    expect(isLccError(new Error('Failed'))).toBe(false);
    expect(isLccError('LCCError')).toBe(false);
    expect(isLccError(null)).toBe(false);
  });
});
