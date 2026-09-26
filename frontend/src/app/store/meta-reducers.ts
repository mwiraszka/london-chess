import { RouterState } from '@ngrx/router-store';
import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { compact, omit, pick } from 'lodash';
import { localStorageSync } from 'ngrx-store-localstorage';

import { isPresignedUrlExpired } from '@app/utils';

import { environment } from '@env';

import { version as currentVersion } from '../../../package.json';
import { AppState } from './app/app.reducer';
import {
  ArticlesState,
  initialState as articlesInitialState,
} from './articles/articles.reducer';
import * as AuthActions from './auth/auth.actions';
import { AuthState } from './auth/auth.reducer';
import { EventsState, initialState as eventsInitialState } from './events/events.reducer';
import { GamesState, initialState as gamesInitialState } from './games/games.reducer';
import { ImagesState, initialState as imagesInitialState } from './images/images.reducer';
import {
  MembersState,
  initialState as membersInitialState,
} from './members/members.reducer';
import { NavState } from './nav/nav.reducer';
import {
  TournamentsState,
  initialState as tournamentsInitialState,
} from './tournaments/tournaments.reducer';

export interface MetaState {
  appState?: AppState;
  articlesState?: ArticlesState;
  authState?: AuthState;
  eventsState?: EventsState;
  gamesState?: GamesState;
  imagesState?: ImagesState;
  membersState?: MembersState;
  navState?: NavState;
  routerState?: RouterState;
  tournamentsState?: TournamentsState;
}

const hydratedStates = [
  'appState',
  'articlesState',
  'eventsState',
  'gamesState',
  'imagesState',
  'membersState',
  'navState',
  'tournamentsState',
] as Array<keyof Exclude<MetaState, RouterState>>;

// State saved by an app version older than these no longer fits its reducer
const FIRST_COMPATIBLE_VERSIONS: Partial<Record<string, number[]>> = {
  articlesState: [6, 2, 0],
  eventsState: [6, 2, 0],
  imagesState: [6, 2, 0],
  membersState: [6, 2, 0],
};

// What only describes the current visit, so every visit starts from these
const UNPERSISTED_FIELDS: Partial<Record<string, object>> = {
  articlesState: pick(articlesInitialState, ['failedLoads', 'isFetchingFiltered']),
  eventsState: pick(eventsInitialState, ['failedLoads', 'isFetchingFiltered']),
  // Of the archives, only how they were last queried carries over to the next visit
  gamesState: omit(gamesInitialState, 'query'),
  imagesState: pick(imagesInitialState, [
    'failedLoads',
    'isFetchingFiltered',
    'uploadProgress',
  ]),
  membersState: pick(membersInitialState, ['failedLoads', 'isFetchingFiltered']),
  // Only the list of tournaments is kept, the crosstables being fetched as they are opened
  tournamentsState: omit(tournamentsInitialState, ['summaries', 'lastSummariesFetch']),
};

function isOlderThan(version: string, minimum: number[]): boolean {
  const parts = version.split('.').map(Number);
  for (const [index, minimumPart] of minimum.entries()) {
    if (parts[index] !== minimumPart) {
      return parts[index] < minimumPart;
    }
  }
  return false;
}

// Versions before 6.3.0 load any `<state>_v*` key they find, whatever shape it was saved
// in, so keys are namespaced to keep the state of later versions out of their reach
const KEY_PREFIX = 'lcc.';

export function stateStorageKey(stateName: string, version = currentVersion): string {
  return `${KEY_PREFIX}${stateName}.v${version}`;
}

function parseStateStorageKey(
  key: string,
): { stateName: string; version: string } | null {
  const match = /^lcc\.([^.]+)\.v(.+)$/.exec(key) ?? /^([^_]+)_v(.+)$/.exec(key);
  return match && (hydratedStates as string[]).includes(match[1])
    ? { stateName: match[1], version: match[2] }
    : null;
}

function currentVersionKeys(): string[] {
  return Object.keys(localStorage).filter(
    key => key.startsWith(KEY_PREFIX) && key.endsWith(`.v${currentVersion}`),
  );
}

/**
 * Updates hydrated state keys to new app version in local storage
 */
export function updateStateVersionsInLocalStorageMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  const keysToUpdate = Object.keys(localStorage).flatMap(key => {
    const parsed = parseStateStorageKey(key);
    return parsed && (parsed.version !== currentVersion || !key.startsWith(KEY_PREFIX))
      ? [{ key, ...parsed }]
      : [];
  });

  let migrated = false;

  return (state, action) => {
    if (!migrated && keysToUpdate.length) {
      migrated = true;
      console.info(`[LCC] Welcome to version ${currentVersion}`);

      const imagesStateRemoved = keysToUpdate.some(
        ({ stateName }) => stateName === 'imagesState',
      );

      keysToUpdate.forEach(({ key, stateName, version }) => {
        const stateValue = localStorage.getItem(key) || '';

        // Skip migrating state from v5.12.x or older to force a reset of stale data
        const [major, minor] = version.split('.').map(Number);
        const isStaleVersion = major < 5 || (major === 5 && minor <= 12);
        const firstCompatibleVersion = FIRST_COMPATIBLE_VERSIONS[stateName];
        // A cached older build may load after a newer one has saved its state
        const isIncompatible =
          (!!firstCompatibleVersion && isOlderThan(version, firstCompatibleVersion)) ||
          isOlderThan(currentVersion, version.split('.').map(Number));

        // Remove the old key first to free up space before writing the new one
        localStorage.removeItem(key);

        // Keep state from the previous version unless it is imagesState, stale or incompatible
        if (stateName !== 'imagesState' && !isStaleVersion && !isIncompatible) {
          try {
            localStorage.setItem(stateStorageKey(stateName), stateValue);
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
  getItem: (key: string) => localStorage.getItem(stateStorageKey(key)),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(stateStorageKey(key), value);
    } catch {
      console.warn(`[LCC] Could not persist ${key} to localStorage (quota exceeded)`);
    }
  },
  removeItem: (key: string) => localStorage.removeItem(stateStorageKey(key)),
  clear: () => currentVersionKeys().forEach(key => localStorage.removeItem(key)),
  key: (index: number) => currentVersionKeys()[index] || null,
  get length() {
    return currentVersionKeys().length;
  },
};

/**
 * Re-hydrates state from local storage
 */
export function hydrationMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  return localStorageSync({
    keys: hydratedStates.map(stateKey => {
      const unpersistedFields = UNPERSISTED_FIELDS[stateKey] ?? {};
      const restore = <T extends object>(stateSlice: T): T => ({
        ...stateSlice,
        ...unpersistedFields,
      });

      return {
        [stateKey]: {
          serialize: (stateSlice: object) =>
            omit(stateSlice, Object.keys(unpersistedFields)),
          deserialize:
            stateKey === 'imagesState'
              ? (stateSlice: ImagesState) => stripExpiredImageUrls(restore(stateSlice))
              : restore,
        },
      };
    }),
    rehydrate: true,
    restoreDates: false,
    storage: versionedStorage,
  })(reducer);
}

/**
 * Drops every cached record and draft when a session ends or loses its admin
 * rights, so member details and unsaved edits do not outlive the session in
 * local storage.
 */
export function clearRecordsOnAccessLossMetaReducer(
  reducer: ActionReducer<MetaState>,
): ActionReducer<MetaState> {
  return (state, action) => {
    if (state && action.type === AuthActions.userChanged.type) {
      const { user } = action as ReturnType<typeof AuthActions.userChanged>;
      const previous = state.authState?.user ?? null;

      if (previous && (!user || (previous.isAdmin && !user.isAdmin))) {
        return reducer(
          {
            ...state,
            articlesState: articlesInitialState,
            eventsState: eventsInitialState,
            imagesState: imagesInitialState,
            membersState: membersInitialState,
          },
          action,
        );
      }
    }

    return reducer(state, action);
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
  clearRecordsOnAccessLossMetaReducer,
]);
