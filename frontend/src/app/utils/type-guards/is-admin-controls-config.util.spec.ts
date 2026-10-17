import { isAdminControlsConfig } from './is-admin-controls-config.util';

describe('isAdminControlsConfig', () => {
  it('should accept an object with a delete callback, but nothing else', () => {
    expect(isAdminControlsConfig({ deleteCb: () => undefined, itemName: 'Blitz' })).toBe(
      true,
    );
    expect(isAdminControlsConfig({ itemName: 'Blitz' })).toBe(false);
    expect(isAdminControlsConfig(null)).toBe(false);
    expect(isAdminControlsConfig(undefined)).toBe(false);
  });
});
