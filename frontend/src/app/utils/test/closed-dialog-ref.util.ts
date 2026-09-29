import { DialogRef } from '@eagami/ui';

export function closedDialogRef<R>(result?: R): DialogRef<R> {
  const dialogRef = new DialogRef<R>();
  dialogRef.close(result);
  return dialogRef;
}
