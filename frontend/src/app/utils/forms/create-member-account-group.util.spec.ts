import { MIN_YEAR_OF_BIRTH } from '@app/constants/member-details';

import { createMemberAccountGroup } from './create-member-account-group.util';

describe('createMemberAccountGroup', () => {
  const filled = () => {
    const group = createMemberAccountGroup();
    group.setValue({
      firstName: 'Jane',
      lastName: 'Smith',
      yearOfBirth: 1990,
      city: 'London',
      phoneNumber: '',
      lichessUsername: '',
      chessComUsername: '',
      email: 'jane@example.com',
    });
    return group;
  };

  it('should start empty and incomplete', () => {
    const group = createMemberAccountGroup();

    expect(group.valid).toBe(false);
    expect(group.getRawValue()).toEqual({
      firstName: '',
      lastName: '',
      yearOfBirth: null,
      city: '',
      phoneNumber: '',
      lichessUsername: '',
      chessComUsername: '',
      email: '',
    });
  });

  it('should accept the required details with the optional ones left blank', () => {
    const group = filled();

    expect(group.valid).toBe(true);
  });

  it('should require a name, year of birth, city and email', () => {
    const group = filled();

    for (const name of ['firstName', 'lastName', 'city', 'email'] as const) {
      group.controls[name].setValue('');
    }
    group.controls.yearOfBirth.setValue(null);

    expect(
      Object.entries(group.controls)
        .filter(([, control]) => control.hasError('required'))
        .map(([name]) => name)
        .sort(),
    ).toEqual(['city', 'email', 'firstName', 'lastName', 'yearOfBirth']);
  });

  it('should keep a year of birth between the earliest allowed and this year', () => {
    const { yearOfBirth } = filled().controls;

    yearOfBirth.setValue(MIN_YEAR_OF_BIRTH - 1);
    const tooEarly = yearOfBirth.hasError('min');
    yearOfBirth.setValue(new Date().getFullYear() + 1);
    const inTheFuture = yearOfBirth.hasError('max');

    expect([tooEarly, inTheFuture]).toEqual([true, true]);
  });

  it('should check the phone number, chess usernames and email are written as expected', () => {
    const { controls } = filled();

    controls.phoneNumber.setValue('555-0123');
    controls.lichessUsername.setValue('x');
    controls.chessComUsername.setValue('has spaces');
    controls.email.setValue('not-an-email');

    expect(controls.phoneNumber.hasError('pattern')).toBe(true);
    expect(controls.lichessUsername.hasError('pattern')).toBe(true);
    expect(controls.chessComUsername.hasError('pattern')).toBe(true);
    expect(controls.email.valid).toBe(false);
  });
});
