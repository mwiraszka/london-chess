import { isDefined } from './is-defined.util';

/**
 * Validates the given object using the provided 'types' schema (see example schema below).
 * Note: `null` type is handled separately from `object` so that if this validation succeeds,
 * any inner objects can then be handled separately using this same method (e.g. ModificationInfo).
 *
 * @example
 * {
 *   id: ['string' | 'null'],
 *   name: 'string',
 *   salary: ['number' | 'undefined'],
 *   modificationInfo: 'object',
 * }
 */
export function validateObjectByTypes<T>(
  object: unknown,
  types: Record<keyof T, string | string[]>,
): Error | 'valid' {
  if (typeof object !== 'object' || !isDefined(object)) {
    return new Error('not a valid object.');
  }

  // TODO: Can be removed once MongoDB get requests updated to remove __v property
  if ('__v' in object) {
    delete (object as Record<string, unknown>)['__v'];
  }

  for (const [key, value] of Object.entries(object)) {
    if (!Object.getOwnPropertyNames(types).includes(key)) {
      return new Error(`input contains unknown property ${key}`);
    }

    let expectedTypes = types[key as keyof typeof types];
    expectedTypes = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];

    const typeofValue =
      typeof value !== 'object' ? typeof value : value === null ? 'null' : 'object';

    if (!expectedTypes.includes(typeofValue)) {
      return new Error(
        `property ${key} was found to be of ${typeofValue} type, but can only be of the following types: [${expectedTypes.join(', ')}]`,
      );
    }
  }

  const expectedPropertyCount = Object.getOwnPropertyNames(types).length;
  const objectPropertyCount = Object.getOwnPropertyNames(object).length;

  if (objectPropertyCount > expectedPropertyCount) {
    return new Error(
      `${objectPropertyCount - expectedPropertyCount} unknown properties found on the object`,
    );
  }

  if (objectPropertyCount < expectedPropertyCount) {
    return new Error(
      `${expectedPropertyCount - objectPropertyCount} properties missing on the object`,
    );
  }

  return 'valid';
}
