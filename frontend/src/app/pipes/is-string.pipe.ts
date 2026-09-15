import { Pipe, PipeTransform } from '@angular/core';

import { isString } from '@app/utils';

/**
 * {@link isString()} as a pipe.
 */
@Pipe({
  name: 'isString',
})
export class IsStringPipe implements PipeTransform {
  transform(value: unknown): value is string {
    return isString(value);
  }
}
