import { Pipe, PipeTransform } from '@angular/core';

import { InternalPath } from '@app/models';
import { isDefined } from '@app/utils';

/**
 * Parse potential InternalPath tuple and add '/' prefix for Angular's routerLink.
 */
@Pipe({
  name: 'routerLink',
})
export class RouterLinkPipe implements PipeTransform {
  transform(path?: InternalPath): string | undefined {
    if (!isDefined(path)) {
      return;
    }

    const fullPath = Array.isArray(path) ? path.join('/') : path;
    return '/' + fullPath;
  }
}
