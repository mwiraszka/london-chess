import { isDefined } from '@app/utils';

/**
 * Check whether a `localStorage` or `sessionStorage` is supported.
 *
 * Browsers can make the storage not accessible in different ways, such as not exposing it at all
 * on the global object, or throwing errors as soon as it's attempted to be accessed. To account
 * for all these cases, try to store a dummy item using a try & catch to analyze the thrown error.
 *
 * @param webStorageType The Web Storage API to check
 */
export function isStorageSupported(
  webStorageType: 'localStorage' | 'sessionStorage' = 'localStorage',
): boolean {
  let storage: Storage | undefined;

  try {
    storage = window[webStorageType];

    if (!storage) {
      return false;
    }

    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);

    return true;
  } catch (error) {
    // Acknowledge a QuotaExceededError only if there's something already stored
    const isValidQuotaExceededError =
      isDefined(storage) &&
      error instanceof DOMException &&
      (error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    return isValidQuotaExceededError;
  }
}
