import { camelCaseToSentenceCase } from './camel-case-to-sentence-case.util';

describe('camelCaseToSentenceCase', () => {
  it('converts camelCase strings correctly', () => {
    expect(camelCaseToSentenceCase('camelCase')).toBe('Camel case');
    expect(camelCaseToSentenceCase('someVariableName')).toBe('Some variable name');
    expect(camelCaseToSentenceCase('anotherExample')).toBe('Another example');
    expect(camelCaseToSentenceCase('withNumbers123')).toBe('With numbers123');
  });

  it('handles single character strings', () => {
    expect(camelCaseToSentenceCase('a')).toBe('A');
    expect(camelCaseToSentenceCase('z')).toBe('Z');
    expect(camelCaseToSentenceCase('5')).toBe('5');
  });

  it('handles already capitalized strings', () => {
    expect(camelCaseToSentenceCase('Ready')).toBe('Ready');
  });

  it('handles empty strings', () => {
    expect(camelCaseToSentenceCase('')).toBe('');
  });

  it('handles existing spaces and special characters', () => {
    expect(camelCaseToSentenceCase('hello world')).toBe('Hello world');
    expect(camelCaseToSentenceCase('hello-world')).toBe('Hello-world');
    expect(camelCaseToSentenceCase('hello_world')).toBe('Hello_world');
    expect(camelCaseToSentenceCase('hello.world')).toBe('Hello.world');
    expect(camelCaseToSentenceCase('!hello')).toBe('!hello');
    expect(camelCaseToSentenceCase('123abc')).toBe('123abc');
  });
});
