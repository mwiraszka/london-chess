import { Dialog } from '@app/models';

import { lastOpenedDialog } from './last-opened-dialog.util';

describe('lastOpenedDialog', () => {
  const dialog: Dialog = {
    title: 'Confirm',
    body: 'Delete this?',
    confirmButtonText: 'Delete',
  };

  it('should return the dialog from the latest call', () => {
    const openSpy = vi.fn();
    openSpy({ inputs: { dialog: { ...dialog, body: 'Earlier' } } });
    openSpy({ inputs: { dialog } });

    expect(lastOpenedDialog(openSpy)).toBe(dialog);
  });

  it('should fail when no confirmation dialog was opened', () => {
    const openSpy = vi.fn();
    openSpy({ inputs: { images: [] } });

    expect(() => lastOpenedDialog(openSpy)).toThrow('No confirmation dialog was opened.');
  });
});
