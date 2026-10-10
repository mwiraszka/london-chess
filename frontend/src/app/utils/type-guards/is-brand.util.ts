import { BRANDS } from '@app/constants/brands';
import { Brand } from '@app/models';

export function isBrand(value: unknown): value is Brand {
  return typeof value === 'string' && Object.hasOwn(BRANDS, value);
}
