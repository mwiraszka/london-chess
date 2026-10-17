import { lastAdminMenuControls } from './last-admin-menu-controls.util';

describe('lastAdminMenuControls', () => {
  it('should read the actions the admin menu was last opened with', () => {
    const controls = { deleteCb: vi.fn(), itemName: 'Blitz' };
    const openSpy = { mock: { lastCall: [document.body, null, controls] } };

    const result = lastAdminMenuControls(openSpy);

    expect(result).toBe(controls);
  });

  it('should throw when no admin menu was opened', () => {
    expect(() => lastAdminMenuControls({ mock: {} })).toThrow(
      'No admin menu was opened.',
    );
  });
});
