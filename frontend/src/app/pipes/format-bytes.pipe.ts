import { Pipe, PipeTransform } from '@angular/core';

import { formatBytes } from '@app/utils';

/**
 * {@link formatBytes()} as a pipe.
 */
@Pipe({
  name: 'formatBytes',
})
export class FormatBytesPipe implements PipeTransform {
  transform(input: unknown, decimals = 2): string {
    return formatBytes(input, decimals);
  }
}
