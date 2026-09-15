import { kebabCase } from 'lodash';

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transform string to kebab-case; return `''` if invalid string provided.
 */
@Pipe({
  name: 'kebabCase',
})
export class KebabCasePipe implements PipeTransform {
  transform(value: unknown): string {
    return typeof value === 'string' ? kebabCase(value) : '';
  }
}
