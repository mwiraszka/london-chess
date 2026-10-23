import { Pipe, PipeTransform } from '@angular/core';

import { isUnrated } from '@app/utils';

@Pipe({
  name: 'ratingLabel',
})
export class RatingLabelPipe implements PipeTransform {
  transform(rating: string): string {
    return isUnrated(rating) ? 'Unrated' : rating;
  }
}
