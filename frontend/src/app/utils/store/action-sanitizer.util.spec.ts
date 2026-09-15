import { actionSanitizer } from './action-sanitizer.util';

describe('actionSanitizer', () => {
  it('should return a copy of the action', () => {
    const action = { type: '[Test] Something happened', payload: 'value' };

    const result = actionSanitizer(action);

    expect(result).toEqual(action);
    expect(result).not.toBe(action);
  });
});
