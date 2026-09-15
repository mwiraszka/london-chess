import { FormControl, ValidationErrors } from '@angular/forms';

import { textValidator } from './text.validator';

describe('textValidator', () => {
  it('returns `null` for an empty string', () => {
    expect(getErrorForValue('')).toBeFalsy();
  });

  it('returns `null` if valid', () => {
    expect(getErrorForValue('My text!')).toBeFalsy();
    expect(
      getErrorForValue('Text with common punctuation and em dash — here'),
    ).toBeFalsy();
    expect(getErrorForValue('Unicode letters: café naïve résumé')).toBeFalsy();
    expect(getErrorForValue('Numbers and symbols: 123 @#$%')).toBeFalsy();
    expect(getErrorForValue('Text with emoji 😢')).toBeFalsy();
    expect(getErrorForValue('Text with complex emoji 👨‍👩‍👧‍👦')).toBeFalsy();
  });

  it('returns `invalidText` error if invalid', () => {
    const error = { invalidText: true };

    expect(getErrorForValue('Control chars: \u0000')).toEqual(error);
  });
});

function getErrorForValue(value: unknown): ValidationErrors | null {
  const control = new FormControl(value, textValidator);
  return control.errors;
}
