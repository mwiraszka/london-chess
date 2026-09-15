import { generateId } from './generate-id.util';

describe('generateId', () => {
  it('defaults out-of-range and `undefined`length inputs to an ID of length 24', () => {
    expect(/^[a-f\d]{24}$/.test(generateId(-100))).toBeTruthy();
    expect(/^[a-f\d]{24}$/.test(generateId(-1))).toBeTruthy();
    expect(/^[a-f\d]{24}$/.test(generateId(0))).toBeTruthy();
    expect(/^[a-f\d]{24}$/.test(generateId())).toBeTruthy();
    expect(/^[a-f\d]{24}$/.test(generateId(101))).toBeTruthy();
  });

  it('generates a valid ID based on the valid length provided', () => {
    expect(/^[a-f\d]{1}$/.test(generateId(1))).toBeTruthy();
    expect(/^[a-f\d]{2}$/.test(generateId(2))).toBeTruthy();
    expect(/^[a-f\d]{24}$/.test(generateId(24))).toBeTruthy();
    expect(/^[a-f\d]{100}$/.test(generateId(100))).toBeTruthy();
  });
});
