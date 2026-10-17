import { AdminControlsConfig } from '@app/models';

import { isRecord } from './is-record.util';

export function isAdminControlsConfig(value: unknown): value is AdminControlsConfig {
  return isRecord(value) && typeof value['deleteCb'] === 'function';
}
