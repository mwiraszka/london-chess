import { validateObjectByTypes } from './validate-object-by-types.util';

interface Sample {
  name: string;
  note: string | null;
  details: object;
}

const TYPES: Record<keyof Sample, string | string[]> = {
  name: 'string',
  note: ['string', 'null'],
  details: 'object',
};

describe('validateObjectByTypes', () => {
  it('should accept an object with every property of an allowed type', () => {
    const result = validateObjectByTypes(
      { name: 'Jane', note: null, details: {} },
      TYPES,
    );

    expect(result).toBe('valid');
  });

  it('should reject anything that is not an object', () => {
    expect(validateObjectByTypes(null, TYPES)).toEqual(new Error('not a valid object.'));
    expect(validateObjectByTypes('Jane', TYPES)).toEqual(
      new Error('not a valid object.'),
    );
  });

  it('should reject unknown properties and properties of the wrong type', () => {
    const unknown = validateObjectByTypes(
      { name: 'Jane', note: null, details: {}, extra: 1 },
      TYPES,
    );
    const wrongType = validateObjectByTypes(
      { name: 'Jane', note: 5, details: {} },
      TYPES,
    );
    const nullObject = validateObjectByTypes(
      { name: 'Jane', note: null, details: null },
      TYPES,
    );

    expect(unknown).toEqual(new Error('input contains unknown property extra'));
    expect(wrongType).toEqual(
      new Error(
        'property note was found to be of number type, but can only be of the following types: [string, null]',
      ),
    );
    expect(nullObject).toBeInstanceOf(Error);
  });

  it('should reject an object missing properties', () => {
    const result = validateObjectByTypes({ name: 'Jane' }, TYPES);

    expect(result).toEqual(new Error('2 properties missing on the object'));
  });

  it('should ignore and remove a Mongo version key', () => {
    const object = { name: 'Jane', note: null, details: {}, __v: 0 };

    const result = validateObjectByTypes(object, TYPES);

    expect(result).toBe('valid');
    expect(object).not.toHaveProperty('__v');
  });
});
