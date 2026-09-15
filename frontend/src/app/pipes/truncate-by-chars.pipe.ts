import { Pipe, PipeTransform } from '@angular/core';

import { isDefined } from '@app/utils';

/**
 * Truncate text down to the number of characters provided.
 *
 * With ellipsis added (default), text will truncate by an additional 3 characters.
 */
@Pipe({
  name: 'truncateByChars',
})
export class TruncateByCharsPipe implements PipeTransform {
  transform(text?: string, characterLimit?: number, withEllipsis = true): string {
    if (!isDefined(text) || !isDefined(characterLimit) || characterLimit < 1) {
      return '';
    }

    if (text.length <= characterLimit) {
      return text;
    }

    if (withEllipsis && characterLimit <= 3) {
      return '.'.repeat(characterLimit);
    }

    return withEllipsis
      ? text.slice(0, characterLimit).slice(0, -3).concat('...')
      : text.slice(0, characterLimit);
  }
}
