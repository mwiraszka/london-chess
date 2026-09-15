import { Pipe, PipeTransform } from '@angular/core';

import { isDefined } from '@app/utils';

/**
 * {@link isDefined()} as a pipe.
 */
@Pipe({
  name: 'isDefined',
})
export class IsDefinedPipe implements PipeTransform {
  transform<T>(value: T & unknown): value is NonNullable<T> {
    return isDefined(value);
  }
}
