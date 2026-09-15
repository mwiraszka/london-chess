import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generate an array of sequential integers – useful for setting up basic loops in templates.
 */
@Pipe({
  name: 'range',
})
export class RangePipe implements PipeTransform {
  transform(length: number, offset = 0): number[] {
    if (length < 1) {
      return [];
    }

    const array = [];
    for (let i = 0; i < length; i++) {
      array.push(offset + i);
    }
    return array;
  }
}
