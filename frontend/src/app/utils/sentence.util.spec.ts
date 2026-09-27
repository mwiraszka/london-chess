import { asSentence } from './sentence.util';

describe('asSentence', () => {
  it('adds a full stop to text without terminal punctuation', () => {
    expect(asSentence('Could not update password')).toBe('Could not update password.');
  });

  it('leaves text that already ends a sentence untouched', () => {
    expect(asSentence('Saved.')).toBe('Saved.');
    expect(asSentence('Welcome!')).toBe('Welcome!');
    expect(asSentence('Are you sure?')).toBe('Are you sure?');
  });
});
