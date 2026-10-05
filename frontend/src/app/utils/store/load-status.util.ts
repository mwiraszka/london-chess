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

interface WithFailedLoads<Load> {
  failedLoads: Load[];
}

// Trying a load again clears its earlier failure
export function withLoadAttempt<State extends WithFailedLoads<Load>, Load>(
  state: State,
  load: Load,
): State {
  return { ...state, failedLoads: state.failedLoads.filter(failed => failed !== load) };
}

export function withFailedLoad<State extends WithFailedLoads<Load>, Load>(
  state: State,
  load: Load,
): State {
  return { ...state, failedLoads: [...withLoadAttempt(state, load).failedLoads, load] };
}
