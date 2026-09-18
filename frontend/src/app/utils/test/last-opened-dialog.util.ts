import { Dialog } from '@app/models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDialog(value: unknown): value is Dialog {
  return isRecord(value) && typeof value['confirmButtonText'] === 'string';
}

export function lastOpenedDialog(openSpy: { mock: { lastCall?: unknown[] } }): Dialog {
  const config = openSpy.mock.lastCall?.[0];
  const dialog =
    isRecord(config) && isRecord(config['inputs']) ? config['inputs']['dialog'] : null;
  if (!isDialog(dialog)) {
    throw new Error('No confirmation dialog was opened.');
  }
  return dialog;
}
