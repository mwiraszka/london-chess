import { Pipe, PipeTransform } from '@angular/core';

import { DateFormat, IsoDate } from '@app/models';
import { formatDate } from '@app/utils';

/**
 * {@link formatDate()} as a pipe.
 */
@Pipe({
  name: 'formatDate',
})
export class FormatDatePipe implements PipeTransform {
  transform(date?: IsoDate, format?: DateFormat): string {
    return formatDate(date, format);
  }
}
