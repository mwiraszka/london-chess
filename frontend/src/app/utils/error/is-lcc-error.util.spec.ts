import { isLccError } from './is-lcc-error.util';

describe('isLccError', () => {
  it('LCC errors', () => {
    const lccErrorValues = [
      {
        name: 'LCCError',
        message: 'Some error message',
      },
      {
        name: 'LCCError',
        message: '',
      },
      {
        name: 'LCCError',
        message: 'Client error',
        status: 400,
      },
      {
        name: 'LCCError',
        message: 'Server error',
        status: 500,
      },
      {
        name: 'LCCError',
        message: 'Some error message',
        someOtherProperty: 'Hello world',
      },
    ];

    lccErrorValues.forEach(value => expect(isLccError(value)).toBe(true));
  });

  it('not LCC errors', () => {
    const notLccErrorValues = [
      undefined,
      null,
      {},
      { message: 'Some message' },
      { name: 'LCCError' },
      { name: 'LCC Error', message: 'Some error message' },
      { name: 'LCCError', message: 42, status: 500 },
      { name: 'LCCError', message: null, status: 500 },
      { name: 42, message: 'Some error message', status: 500 },
      { name: null, message: 'Some error message', status: 500 },
    ];

    notLccErrorValues.forEach(value => expect(isLccError(value)).toBe(false));
  });
});
