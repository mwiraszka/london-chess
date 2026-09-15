import { GameScore } from '@app/models';

import { isString } from './is-string.util';

export function isGameScore(value: unknown): value is GameScore {
  return isString(value) && ['1', '1/2', '0', '*'].includes(value);
}
