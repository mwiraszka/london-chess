import { closedDialogRef } from './closed-dialog-ref.util';

describe('closedDialogRef', () => {
  it('should settle with the given answer', async () => {
    const dialogRef = closedDialogRef('confirm');

    expect(dialogRef.closed()).toBe(true);
    expect(await dialogRef.result).toBe('confirm');
  });

  it('should settle as a dismissal without an answer', async () => {
    const dialogRef = closedDialogRef();

    expect(await dialogRef.result).toBeUndefined();
  });
});
