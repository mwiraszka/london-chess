import { FormControl, ValidationErrors } from '@angular/forms';

import { urlValidator } from './url.validator';

function getErrorForValue(value: string): ValidationErrors | null {
  return new FormControl(value, urlValidator).errors;
}

describe('urlValidator', () => {
  it('returns `null` for an empty value', () => {
    expect(getErrorForValue('')).toBeNull();
    expect(getErrorForValue('  ')).toBeNull();
  });

  it('returns `null` for a web address', () => {
    expect(getErrorForValue('https://londonchess.ca/article/view/6a7f6f69')).toBeNull();
    expect(getErrorForValue(' http://example.com ')).toBeNull();
  });

  it('returns `invalidUrl` for anything else', () => {
    expect(getErrorForValue('londonchess.ca/article')).toEqual({ invalidUrl: true });
    expect(getErrorForValue('ftp://londonchess.ca')).toEqual({ invalidUrl: true });
    expect(getErrorForValue('javascript:alert(1)')).toEqual({ invalidUrl: true });
  });
});
