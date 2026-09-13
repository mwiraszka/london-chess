import { RouterState } from '@ngrx/router-store';
import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { compact } from 'lodash';
import { localStorageSync } from 'ngrx-store-localstorage';

import { hasCallState, isPresignedUrlExpired } from '@app/utils';

import { environment } from '@env';

import { version as currentVersion } from '../../../package.json';
import { AppState } from './app';
import { ArticlesState } from './articles';
import { AuthState } from './auth';
import { EventsState } from './events';
import { ImagesState } from './images';
import { MembersState } from './members';
import { NavState } from './nav';

export interface MetaState {
  appState?: AppState;
  articlesState?: ArticlesState;
  authState?: AuthState;
  eventsState?: EventsState;
  imagesState?: ImagesState;
  membersState?: MembersState;
  navState?: NavState;
  routerState?: RouterState;
}

const hydratedStates = [
  'appState',
  'articlesState',
  'eventsState',
  'imagesState',
  'membersState',
  'navState',
] as Array<keyof Exclude<MetaState, RouterState>>;

/**
 * Updates hydrated state keys to new app version in local storage
 */
export function updateStateVersionsInLocalStorageMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  const keysToUpdate = Object.keys(localStorage).filter(key => {
    const [stateName, version] = key.split('_v');
    return (hydratedStates as string[]).includes(stateName) && version !== currentVersion;
  });

  let migrated = false;

  return (state, action) => {
    if (!migrated && keysToUpdate.length) {
      migrated = true;
      console.info(`[LCC] Welcome to version ${currentVersion}`);

      const imagesStateRemoved = keysToUpdate.some(key =>
        key.startsWith('imagesState_v'),
      );

      keysToUpdate.forEach(key => {
        const stateName = key.split('_v')[0];
        const version = key.split('_v')[1];
        const stateValue = localStorage.getItem(key) || '';

        // Skip migrating state from v5.12.x or older to force a reset of stale data
        const [major, minor] = (version || '').split('.').map(Number);
        const isStaleVersion = major < 5 || (major === 5 && minor <= 12);

        // Remove the old key first to free up space before writing the new one
        localStorage.removeItem(key);

        // Keep all state from previous version except imagesState and stale versions
        if (stateName !== 'imagesState' && !isStaleVersion) {
          try {
            localStorage.setItem(`${stateName}_v${currentVersion}`, stateValue);
          } catch {
            console.warn(
              `[LCC] Could not migrate ${stateName} to new version (localStorage quota exceeded)`,
            );
          }
        }
      });

      // Clear browser cache storage when imagesState is removed
      if (imagesStateRemoved && 'caches' in window) {
        caches
          .keys()
          .then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                console.info(`[LCC] Clearing cache: ${cacheName}`);
                return caches.delete(cacheName);
              }),
            );
          })
          .then(() => {
            console.info('[LCC] All browser caches cleared for new version');
          })
          .catch(error => {
            console.error('[LCC] Failed to clear browser caches:', error);
          });
      }
    }

    return reducer(state, action);
  };
}

export function actionLogMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  return (state, action) => {
    console.info(
      `%c [${new Date().toLocaleTimeString()}] ${action.type}`,
      'background-color: #ddd; color: #222',
    );
    return reducer(state, action);
  };
}

/**
 * Custom storage mechanism that adds versioning to keys
 */
export const versionedStorage = {
  getItem: (key: string) => {
    return localStorage.getItem(`${key}_v${currentVersion}`);
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(`${key}_v${currentVersion}`, value);
    } catch {
      console.warn(`[LCC] Could not persist ${key} to localStorage (quota exceeded)`);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(`${key}_v${currentVersion}`);
  },
  clear: () => {
    Object.keys(localStorage)
      .filter(k => k.endsWith(`_v${currentVersion}`))
      .forEach(k => localStorage.removeItem(k));
  },
  key: (index: number) => {
    const keys = Object.keys(localStorage).filter(k => k.endsWith(`_v${currentVersion}`));
    return keys[index] || null;
  },
  get length() {
    return Object.keys(localStorage).filter(k => k.endsWith(`_v${currentVersion}`))
      .length;
  },
};

/**
 * Re-hydrates state from local storage
 */
export function hydrationMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  return localStorageSync({
    keys: hydratedStates.map(stateKey =>
      stateKey === 'imagesState'
        ? { imagesState: { deserialize: stripExpiredImageUrls } }
        : stateKey,
    ),
    rehydrate: true,
    restoreDates: false,
    storage: versionedStorage,
  })(reducer);
}

/**
 * Resets loading states on rehydration to prevent stuck loading spinners
 */
export function loadingStateResetMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  return (state, action) => {
    const nextState = reducer(state, action);

    // Only reset on update-reducers action (after hydration completes)
    if (action.type === '@ngrx/store/update-reducers' && nextState) {
      const statesWithCallState: Array<keyof MetaState> = [
        'articlesState',
        'eventsState',
        'imagesState',
        'membersState',
      ];

      let updatedState: MetaState | null = null;

      const idleCallState = {
        status: 'idle' as const,
        loadStart: null,
        error: null,
      };

      statesWithCallState.forEach(stateKey => {
        const stateSlice = nextState[stateKey];
        if (hasCallState(stateSlice) && stateSlice.callState.status === 'loading') {
          if (!updatedState) {
            updatedState = { ...nextState };
          }
          // Use type assertion to work around TypeScript's complex union type
          (updatedState[stateKey] as typeof stateSlice) = {
            ...stateSlice,
            callState: idleCallState,
          };
        }
      });

      if (updatedState) {
        return updatedState;
      }
    }

    return nextState;
  };
}

// Image storage moved off AWS S3, so any persisted URL still pointing there is
// dead regardless of its recorded expiration (older app versions could stamp a
// fresh expiration onto an entity while keeping its old URL)
const RETIRED_STORAGE_HOST = 'amazonaws.com';

function pointsAtRetiredStorage(url: string | undefined): boolean {
  return !!url && url.includes(RETIRED_STORAGE_HOST);
}

/**
 * Drops persisted presigned URLs that are already expired (or inside the
 * refresh buffer), or that point at retired storage, while rehydrating, so
 * components render placeholders and wait for fresh URLs instead of loading
 * doomed ones.
 */
export function stripExpiredImageUrls(imagesState: ImagesState): ImagesState {
  const entities = imagesState.entities ?? {};
  const updatedEntities: typeof entities = {};

  for (const id of Object.keys(entities)) {
    const entity = entities[id];
    const image = entity?.image;
    const stale =
      !!(image?.mainUrl || image?.thumbnailUrl) &&
      (isPresignedUrlExpired(image?.urlExpirationDate) ||
        pointsAtRetiredStorage(image?.mainUrl) ||
        pointsAtRetiredStorage(image?.thumbnailUrl));

    updatedEntities[id] =
      entity && stale
        ? {
            ...entity,
            image: {
              ...entity.image,
              mainUrl: undefined,
              thumbnailUrl: undefined,
              urlExpirationDate: undefined,
            },
          }
        : entity;
  }

  return { ...imagesState, entities: updatedEntities };
}

export const metaReducers: Array<MetaReducer<MetaState, Action<string>>> = compact([
  environment.production ? undefined : actionLogMetaReducer,
  updateStateVersionsInLocalStorageMetaReducer,
  hydrationMetaReducer,
  loadingStateResetMetaReducer,
]);
