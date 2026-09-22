import { Action, ActionReducer, Store, StoreModule } from '@ngrx/store';
import { omit, pick } from 'lodash';
import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image, User } from '@app/models';

import { version } from '../../../package.json';
import { initialState as articlesInitialState } from './articles/articles.reducer';
import * as AuthActions from './auth/auth.actions';
import { initialState as eventsInitialState } from './events/events.reducer';
import { initialState as gamesInitialState, gamesReducer } from './games/games.reducer';
import * as ImagesActions from './images/images.actions';
import {
  ImagesState,
  initialState as imagesInitialState,
  imagesReducer,
} from './images/images.reducer';
import * as MembersActions from './members/members.actions';
import {
  initialState as membersInitialState,
  membersReducer,
} from './members/members.reducer';
import {
  MetaState,
  actionLogMetaReducer,
  clearRecordsOnAccessLossMetaReducer,
  hydrationMetaReducer,
  metaReducers,
  stripExpiredImageUrls,
  updateStateVersionsInLocalStorageMetaReducer,
  versionedStorage,
} from './meta-reducers';

describe('Meta Reducers', () => {
  let mockReducer: ActionReducer<MetaState>;
  let mockState: MetaState;

  beforeEach(() => {
    localStorage.clear();

    mockReducer = vi.fn(
      (state: MetaState | undefined) => state || mockState,
    ) as ActionReducer<MetaState, Action<string>>;
    mockState = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateStateVersionsInLocalStorageMetaReducer', () => {
    it('should remove stale keys from previous versions', () => {
      // Setup: Add stale keys
      localStorage.setItem('eventsState_v1.0.0', '{"events": "old"}');
      localStorage.setItem('appState_v1.0.0', '{"theme": "dark"}');

      const updateStateMetaReducer =
        updateStateVersionsInLocalStorageMetaReducer(mockReducer);
      const action = { type: '@ngrx/store/init' };

      updateStateMetaReducer(mockState, action);

      // Should not contain old version keys
      expect(localStorage.getItem('eventsState_v1.0.0')).toBeNull();
    });

    it('should preserve state from previous version', () => {
      const oldAppState = JSON.stringify({ theme: 'dark' });
      localStorage.setItem('appState_v6.1.1', oldAppState);

      const updateStateMetaReducer =
        updateStateVersionsInLocalStorageMetaReducer(mockReducer);
      const action = { type: '@ngrx/store/init' };

      updateStateMetaReducer(mockState, action);

      // Should preserve appState with current version
      const preserved = localStorage.getItem(`appState_v${version}`);
      expect(preserved).toBe(oldAppState);
    });

    it('should drop record state saved in an incompatible shape', () => {
      const staleKeys = ['articlesState', 'eventsState', 'imagesState', 'membersState'];
      staleKeys.forEach(key => localStorage.setItem(`${key}_v6.1.1`, '{"entities": {}}'));
      const updateStateMetaReducer =
        updateStateVersionsInLocalStorageMetaReducer(mockReducer);

      updateStateMetaReducer(mockState, { type: '@ngrx/store/init' });

      staleKeys.forEach(key => {
        expect(localStorage.getItem(`${key}_v6.1.1`)).toBeNull();
        expect(localStorage.getItem(`${key}_v${version}`)).toBeNull();
      });
    });

    it('should keep event state saved in a compatible shape', () => {
      const oldEventsState = JSON.stringify({ entities: {} });
      localStorage.setItem('eventsState_v6.2.0', oldEventsState);
      const updateStateMetaReducer =
        updateStateVersionsInLocalStorageMetaReducer(mockReducer);

      updateStateMetaReducer(mockState, { type: '@ngrx/store/init' });

      expect(localStorage.getItem(`eventsState_v${version}`)).toBe(oldEventsState);
    });

    it('should drop state saved by a newer version of the app', () => {
      localStorage.setItem('appState_v10.50.0', '{"theme": "dark"}');
      const updateStateMetaReducer =
        updateStateVersionsInLocalStorageMetaReducer(mockReducer);

      updateStateMetaReducer(mockState, { type: '@ngrx/store/init' });

      expect(localStorage.getItem('appState_v10.50.0')).toBeNull();
      expect(localStorage.getItem(`appState_v${version}`)).toBeNull();
    });

    it('should not remove keys with current version', () => {
      const currentKey = `appState_v${version}`;
      localStorage.setItem(currentKey, '{"theme": "dark"}');

      const updateStateMetaReducer =
        updateStateVersionsInLocalStorageMetaReducer(mockReducer);
      const action = { type: '@ngrx/store/init' };

      updateStateMetaReducer(mockState, action);

      expect(localStorage.getItem(currentKey)).toBe('{"theme": "dark"}');
    });
  });

  describe('actionLogMetaReducer', () => {
    let consoleInfoSpy: MockInstance;

    beforeEach(() => {
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleInfoSpy.mockRestore();
    });

    it('should log actions with timestamp', () => {
      const wrappedActionLogMetaReducer = actionLogMetaReducer(mockReducer);
      const action = { type: '[Auth] Login Requested' };

      wrappedActionLogMetaReducer(mockState, action);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Auth] Login Requested'),
        expect.any(String),
      );
    });

    it('should pass state through reducer', () => {
      const expectedState = { ...mockState, modified: true };
      mockReducer = vi.fn(() => expectedState);

      const wrappedActionLogMetaReducer = actionLogMetaReducer(mockReducer);
      const action = { type: 'TEST_ACTION' };

      const result = wrappedActionLogMetaReducer(mockState, action);

      expect(result).toBe(expectedState);
      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });
  });

  describe('versionedStorage', () => {
    const testKey = 'testKey';
    const testValue = 'testValue';

    it('should store and retrieve items with version suffix', () => {
      versionedStorage.setItem(testKey, testValue);

      const retrieved = versionedStorage.getItem(testKey);
      expect(retrieved).toBe(testValue);

      // Check that it's actually stored with version
      const rawKey = `${testKey}_v${version}`;
      expect(localStorage.getItem(rawKey)).toBe(testValue);
    });

    it('should remove items with version suffix', () => {
      versionedStorage.setItem(testKey, testValue);
      versionedStorage.removeItem(testKey);

      expect(versionedStorage.getItem(testKey)).toBeNull();
    });

    it('should clear all versioned items', () => {
      versionedStorage.setItem('key1', 'value1');
      versionedStorage.setItem('key2', 'value2');
      // Add a non-versioned key that shouldn't be removed
      localStorage.setItem('unversioned', 'keep');

      versionedStorage.clear();

      expect(versionedStorage.getItem('key1')).toBeNull();
      expect(versionedStorage.getItem('key2')).toBeNull();
      expect(localStorage.getItem('unversioned')).toBe('keep');
    });

    it('should return correct length of versioned items', () => {
      versionedStorage.setItem('key1', 'value1');
      versionedStorage.setItem('key2', 'value2');
      localStorage.setItem('unversioned', 'should not count');

      expect(versionedStorage.length).toBe(2);
    });

    it('should retrieve key by index', () => {
      versionedStorage.setItem('key1', 'value1');

      const key = versionedStorage.key(0);
      expect(key).toContain('key1');
      expect(key).toContain(`_v${version}`);
    });

    it('should return null for invalid index', () => {
      expect(versionedStorage.key(999)).toBeNull();
    });
  });

  describe('stripExpiredImageUrls', () => {
    const stateWith = (image: Image): ImagesState => ({
      ...imagesInitialState,
      ids: [image.id],
      entities: {
        [image.id]: { image, formData: pick(image, IMAGE_FORM_DATA_PROPERTIES) },
      },
    });

    it('should strip expired presigned URLs', () => {
      const expiredImage: Image = {
        ...MOCK_IMAGES[0],
        mainUrl: 'https://example.com/stale.jpg',
        thumbnailUrl: 'https://example.com/stale-thumb.jpg',
        urlExpirationDate: new Date(Date.now() - 60_000).toISOString(),
      };

      const result = stripExpiredImageUrls(stateWith(expiredImage));

      const image = result.entities[expiredImage.id]?.image;
      expect(image?.mainUrl).toBeUndefined();
      expect(image?.thumbnailUrl).toBeUndefined();
      expect(image?.urlExpirationDate).toBeUndefined();
    });

    it('should strip URLs whose expiration date is missing', () => {
      const undatedImage: Image = {
        ...MOCK_IMAGES[0],
        mainUrl: 'https://example.com/undated.jpg',
        urlExpirationDate: undefined,
      };

      const result = stripExpiredImageUrls(stateWith(undatedImage));

      expect(result.entities[undatedImage.id]?.image.mainUrl).toBeUndefined();
    });

    it('should strip retired-storage URLs even when the recorded expiration is fresh', () => {
      const corruptedImage: Image = {
        ...MOCK_IMAGES[0],
        mainUrl: 'https://old-bucket.s3.us-east-2.amazonaws.com/stale',
        thumbnailUrl: 'https://example.com/fresh-thumb.jpg',
        urlExpirationDate: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
      };

      const result = stripExpiredImageUrls(stateWith(corruptedImage));

      const image = result.entities[corruptedImage.id]?.image;
      expect(image?.mainUrl).toBeUndefined();
      expect(image?.thumbnailUrl).toBeUndefined();
      expect(image?.urlExpirationDate).toBeUndefined();
    });

    it('should keep URLs that are still fresh', () => {
      const freshImage: Image = {
        ...MOCK_IMAGES[0],
        mainUrl: 'https://example.com/fresh.jpg',
        thumbnailUrl: 'https://example.com/fresh-thumb.jpg',
        urlExpirationDate: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
      };

      const result = stripExpiredImageUrls(stateWith(freshImage));

      const image = result.entities[freshImage.id]?.image;
      expect(image?.mainUrl).toBe(freshImage.mainUrl);
      expect(image?.thumbnailUrl).toBe(freshImage.thumbnailUrl);
      expect(image?.urlExpirationDate).toBe(freshImage.urlExpirationDate);
    });

    it('should be applied when hydrating imagesState from local storage', () => {
      const expiredImage: Image = {
        ...MOCK_IMAGES[0],
        mainUrl: 'https://example.com/stale.jpg',
        urlExpirationDate: new Date(Date.now() - 60_000).toISOString(),
      };
      versionedStorage.setItem('imagesState', JSON.stringify(stateWith(expiredImage)));
      mockReducer = vi.fn((state: MetaState | undefined) => state ?? {});
      const wrappedReducer = hydrationMetaReducer(mockReducer);

      const result = wrappedReducer(undefined, { type: '@ngrx/store/init' });

      const image = result.imagesState?.entities[expiredImage.id]?.image;
      expect(image).toBeDefined();
      expect(image?.mainUrl).toBeUndefined();
    });
  });

  describe('hydrationMetaReducer', () => {
    const rememberedQuery = {
      ...INITIAL_GAMES_QUERY,
      filters: { ...INITIAL_GAMES_QUERY.filters, year: 1994 },
    };

    it('should leave request outcomes out of local storage', () => {
      const state: MetaState = {
        articlesState: { ...articlesInitialState, failedLoads: ['homePage'] },
        imagesState: {
          ...imagesInitialState,
          failedLoads: ['metadata'],
          uploadProgress: { uploaded: 1, total: 2 },
        },
      };
      mockReducer = vi.fn(() => state);
      const wrappedReducer = hydrationMetaReducer(mockReducer);

      wrappedReducer(state, { type: '[Test] State changed' });

      const savedArticles = JSON.parse(versionedStorage.getItem('articlesState') ?? '{}');
      const savedImages = JSON.parse(versionedStorage.getItem('imagesState') ?? '{}');
      expect(savedArticles).not.toHaveProperty('failedLoads');
      expect(savedArticles).toHaveProperty('options');
      expect(savedImages).not.toHaveProperty('failedLoads');
      expect(savedImages).not.toHaveProperty('uploadProgress');
    });

    it('should remember only how the archives were last queried', () => {
      const state: MetaState = {
        gamesState: { ...gamesInitialState, filteredCount: 12, query: rememberedQuery },
      };
      mockReducer = vi.fn(() => state);
      const wrappedReducer = hydrationMetaReducer(mockReducer);

      wrappedReducer(state, { type: '[Test] State changed' });

      expect(JSON.parse(versionedStorage.getItem('gamesState') ?? '{}')).toEqual({
        query: rememberedQuery,
      });
    });

    describe('when a visit starts from saved state', () => {
      let store: Store<MetaState>;

      beforeEach(() => {
        versionedStorage.setItem(
          'gamesState',
          JSON.stringify({ query: rememberedQuery }),
        );
        versionedStorage.setItem(
          'membersState',
          JSON.stringify(omit({ ...membersInitialState, totalCount: 56 }, 'failedLoads')),
        );
        versionedStorage.setItem(
          'imagesState',
          JSON.stringify(omit(imagesInitialState, ['failedLoads', 'uploadProgress'])),
        );

        TestBed.configureTestingModule({
          imports: [
            StoreModule.forRoot({}, { metaReducers: [hydrationMetaReducer] }),
            StoreModule.forFeature('gamesState', gamesReducer),
            StoreModule.forFeature('imagesState', imagesReducer),
            StoreModule.forFeature('membersState', membersReducer),
          ],
        });
        store = TestBed.inject(Store);
      });

      it('should restore the saved records', async () => {
        const state = await firstValueFrom(store);

        expect(state.membersState?.totalCount).toBe(56);
      });

      it('should open the archives as they were last queried', async () => {
        const state = await firstValueFrom(store);

        expect(state.gamesState?.query).toEqual(rememberedQuery);
        expect(state.gamesState?.filteredCount).toBeNull();
      });

      it('should start without earlier request outcomes', async () => {
        const state = await firstValueFrom(store);

        expect(state.membersState?.failedLoads).toEqual([]);
        expect(state.imagesState?.failedLoads).toEqual([]);
        expect(state.imagesState?.uploadProgress).toBeNull();
      });

      it('should track the loads made during the visit', async () => {
        const error = { name: 'LCCError' as const, message: 'Unable to load.' };

        store.dispatch(MembersActions.fetchFilteredMembersRequested());
        store.dispatch(MembersActions.fetchFilteredMembersFailed({ error }));
        store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
        store.dispatch(ImagesActions.imageUploadsProgressed({ uploaded: 1, total: 2 }));
        const state = await firstValueFrom(store);

        expect(state.membersState?.failedLoads).toEqual(['filtered']);
        expect(state.imagesState?.uploadProgress).toEqual({ uploaded: 1, total: 2 });
      });
    });
  });

  describe('clearRecordsOnAccessLossMetaReducer', () => {
    const admin: User = {
      id: 'user123',
      firstName: 'Ada',
      lastName: 'Byron',
      email: 'ada@example.com',
      isAdmin: true,
    };
    const nonAdmin: User = { ...admin, isAdmin: false };

    const stateHolding = (user: User | null): MetaState => ({
      authState: { user },
      articlesState: { ...articlesInitialState, lastHomePageFetch: '2026-01-01' },
      eventsState: { ...eventsInitialState, totalCount: 12 },
      imagesState: { ...imagesInitialState, totalCount: 34 },
      membersState: { ...membersInitialState, totalCount: 56 },
    });

    const run = (state: MetaState, user: User | null): MetaState => {
      const reducer = vi.fn(
        (nextState: MetaState | undefined) => nextState ?? {},
      ) as ActionReducer<MetaState, Action<string>>;

      return clearRecordsOnAccessLossMetaReducer(reducer)(
        state,
        AuthActions.userChanged({ user }),
      );
    };

    it('should drop every cached record when the session ends', () => {
      const result = run(stateHolding(admin), null);

      expect(result.articlesState).toEqual(articlesInitialState);
      expect(result.eventsState).toEqual(eventsInitialState);
      expect(result.imagesState).toEqual(imagesInitialState);
      expect(result.membersState).toEqual(membersInitialState);
    });

    it('should drop every cached record when an admin loses their rights', () => {
      const result = run(stateHolding(admin), nonAdmin);

      expect(result.articlesState).toEqual(articlesInitialState);
      expect(result.membersState).toEqual(membersInitialState);
    });

    it('should keep cached records for a visitor who was never logged in', () => {
      const result = run(stateHolding(null), null);

      expect(result.articlesState?.lastHomePageFetch).toBe('2026-01-01');
      expect(result.membersState?.totalCount).toBe(56);
    });

    it('should keep cached records while the user is still an admin', () => {
      const result = run(stateHolding(admin), admin);

      expect(result.articlesState?.lastHomePageFetch).toBe('2026-01-01');
      expect(result.membersState?.totalCount).toBe(56);
    });
  });

  describe('metaReducers array', () => {
    it('should export metaReducers array', () => {
      expect(metaReducers).toBeDefined();
      expect(Array.isArray(metaReducers)).toBe(true);
    });

    it('should include updateStateVersionsInLocalStorageMetaReducer', () => {
      const updateState = metaReducers.find(
        metaReducer =>
          metaReducer.name === 'updateStateVersionsInLocalStorageMetaReducer',
      );
      expect(updateState).toBeDefined();
    });
  });
});
