import { HttpErrorResponse } from '@angular/common/http';

import { parseError } from './parse-error.util';

describe('parseError', () => {
  describe('HttpErrorResponse errors', () => {
    it('when `error.message` exists and is a string', () => {
      const response = new HttpErrorResponse({
        status: 400,
        error: {
          name: 'LCCError',
          message: 'error!',
          error: 'some other error value',
        },
        statusText: 'some status text',
        url: 'some url',
      });

      expect(parseError(response)).toStrictEqual({
        name: 'LCCError',
        status: 400,
        message: 'error!',
      });
    });

    it('when `error.message` exists but is not a string', () => {
      const response = new HttpErrorResponse({
        status: 404,
        error: {
          message: {
            someObject: 'some value',
            error: 'some other error value',
          },
          error: 'another error value',
        },
      });

      // HttpErrorResponse automatically generates error message under `response.message`
      expect(parseError(response)).toStrictEqual({
        name: 'LCCError',
        status: 404,
        message: 'Http failure response for (unknown url): 404 undefined',
      });
    });

    it('when neither message is a string', () => {
      const response = Object.assign(new HttpErrorResponse({ status: 500, error: {} }), {
        message: undefined,
      });

      expect(parseError(response)).toStrictEqual({
        name: 'LCCError',
        status: 500,
        message: 'Unknown HTTP error.',
      });
    });

    it('omits the status when the request never reached the server', () => {
      const response = new HttpErrorResponse({
        status: 0,
        error: { message: 'offline' },
      });

      expect(parseError(response)).toStrictEqual({
        name: 'LCCError',
        status: undefined,
        message: 'offline',
      });
    });
  });

  describe('non-HttpErrorResponse objects', () => {
    it('simple Error objects', () => {
      const error = new Error('error!');

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'error!',
      });
    });

    it('singular string values', () => {
      const error = 'error!';

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'error!',
      });
    });

    it('custom objects', () => {
      const error = {
        message: 'error!',
      };

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'Invalid error.',
      });
    });
  });

  describe('empty values', () => {
    it('`null`', () => {
      const error = null;

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'Empty error.',
      });
    });

    it('`undefined`', () => {
      const error = undefined;

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'Empty error.',
      });
    });

    it('`{}`', () => {
      const error = {};

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'Empty error.',
      });
    });

    it('empty string', () => {
      const error = '';

      expect(parseError(error)).toStrictEqual({
        name: 'LCCError',
        message: 'Empty error.',
      });
    });
  });
});
