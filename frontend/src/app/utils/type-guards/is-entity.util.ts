import { Entity } from '@app/models';

import { isString } from './is-string.util';

export function isEntity(value: unknown): value is Entity {
  return (
    isString(value) && ['article', 'event', 'image', 'album', 'member'].includes(value)
  );
}
