import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';

import { normalizePhoneNumber } from './normalize-phone-number.util';

const ACCEPTED_FORMATS = [
  '416-555-1234',
  '4165551234',
  '(416) 555-1234',
  '(416) 5551234',
  '(416) 555 1234',
];

describe('normalizePhoneNumber', () => {
  it('stores every accepted format, with or without a +1 or 001 prefix, the same way', () => {
    const inputs = ACCEPTED_FORMATS.flatMap(format => [
      format,
      `+1${format}`,
      `+1 ${format}`,
      `001${format}`,
      `001 ${format}`,
    ]);

    const normalized = inputs.map(normalizePhoneNumber);

    expect(new Set(normalized)).toEqual(new Set(['416-555-1234']));
  });

  it('reads a ten-digit number starting with 001 as the number itself', () => {
    const normalized = normalizePhoneNumber('0015551234');

    expect(normalized).toBe('001-555-1234');
  });

  it('leaves a value that is not an accepted format unchanged', () => {
    const inputs = [
      '',
      '416.555.1234',
      '(416)555-1234',
      '+44 20 7946 0958',
      ' 4165551234',
    ];

    const normalized = inputs.map(normalizePhoneNumber);

    expect(normalized).toEqual(inputs);
  });
});

describe('MEMBER_DETAIL_RULES.phoneNumber', () => {
  it('accepts only the listed formats', () => {
    const { pattern } = MEMBER_DETAIL_RULES.phoneNumber;

    const accepted = ACCEPTED_FORMATS.every(format => pattern.test(`+1 ${format}`));
    const rejected = [
      '416 555 1234',
      '(416)555-1234',
      '1 416-555-1234',
      '41655512345',
    ].some(value => pattern.test(value));

    expect(accepted).toBe(true);
    expect(rejected).toBe(false);
  });
});
