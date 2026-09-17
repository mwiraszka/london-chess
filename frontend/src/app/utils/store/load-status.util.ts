import { LoadStatus } from '@app/models';

// Data already shown stays up when a later refresh fails
export function loadStatus(isLoaded: boolean, hasFailed: boolean): LoadStatus {
  if (isLoaded) {
    return 'loaded';
  }
  return hasFailed ? 'failed' : 'loading';
}

// Content built from several loads shows once all of them have arrived
export function combinedLoadStatus(...statuses: LoadStatus[]): LoadStatus {
  if (statuses.includes('failed')) {
    return 'failed';
  }
  return statuses.includes('loading') ? 'loading' : 'loaded';
}
