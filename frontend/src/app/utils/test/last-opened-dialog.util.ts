import { Dialog } from '@app/models';
import { isRecord } from '@app/utils/type-guards/is-record.util';

function isDialog(value: unknown): value is Dialog {
  return isRecord(value) && typeof value['confirmButtonText'] === 'string';
}

export function lastOpenedDialog(openSpy: { mock: { lastCall?: unknown[] } }): Dialog {
  const options = openSpy.mock.lastCall?.[1];
  const dialog =
    isRecord(options) && isRecord(options['inputs']) ? options['inputs']['dialog'] : null;
  if (!isDialog(dialog)) {
    throw new Error('No confirmation dialog was opened.');
  }
  return dialog;
}
