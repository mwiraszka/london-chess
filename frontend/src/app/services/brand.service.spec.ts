import { derivePalette, validatePalette } from '@eagami/ui';
import { provideState, provideStore } from '@ngrx/store';

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BRANDS } from '@app/constants/brands';
import { UserRecord } from '@app/models';
import { appReducer, initialState } from '@app/store/app/app.reducer';
import {
  MetaState,
  hydrationMetaReducer,
  stateStorageKey,
} from '@app/store/meta-reducers';

import { BrandService } from './brand.service';
import { ClerkService } from './clerk.service';
import { UserService } from './user.service';

describe('BrandService', () => {
  let clerk: { isLoaded: WritableSignal<boolean>; isLoggedIn: WritableSignal<boolean> };
  let user: WritableSignal<UserRecord | null>;

  const record: UserRecord = {
    id: 'user_jane',
    memberNumber: 7,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    isAdmin: false,
    clerkImageUrl: null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    avatarCropState: null,
    avatarUpdatedAt: null,
    hasTemporaryPassword: false,
    showYearOfBirth: false,
    brand: 'classic',
  };

  const root = () => document.documentElement;
  const fontsLink = () => document.querySelector<HTMLLinkElement>('#lcc-brand-fonts');
  const paletteCss = () => document.querySelector('#eagami-palette')?.textContent ?? '';

  // Created by each test, so one can save a state for it to start from first
  const createService = (): BrandService => TestBed.inject(BrandService);

  beforeEach(() => {
    localStorage.clear();
    clerk = { isLoaded: signal(false), isLoggedIn: signal(false) };
    user = signal(null);

    TestBed.configureTestingModule({
      providers: [
        provideStore<MetaState>({}, { metaReducers: [hydrationMetaReducer] }),
        provideState('appState', appReducer),
        { provide: ClerkService, useValue: clerk },
        { provide: UserService, useValue: { user } },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
    fontsLink()?.remove();
    root().removeAttribute('data-brand');
  });

  it.each(Object.entries(BRANDS))(
    'should derive colours from the %s brand that pass the contrast checks',
    (_, { palette }) => {
      const violations = validatePalette(derivePalette(palette));

      expect(violations).toEqual([]);
    },
  );

  it("should dress the site in a brand's colours and fonts", () => {
    const service = createService();

    service.change('playground');
    TestBed.tick();

    const { palette, stylesheet } = BRANDS.playground;
    expect(paletteCss()).toContain(derivePalette(palette).light['--color-brand-default']);
    expect(root().getAttribute('data-brand')).toBe('playground');
    expect(fontsLink()?.href).toBe(stylesheet);
  });

  it("should drop the other brands' fonts for the default look", () => {
    const service = createService();
    service.change('playground');
    TestBed.tick();

    service.change('modern');
    TestBed.tick();

    expect(root().getAttribute('data-brand')).toBe('modern');
    expect(fontsLink()).toBeNull();
  });

  it('should start in the brand last shown in this browser', () => {
    localStorage.setItem(
      stateStorageKey('appState'),
      JSON.stringify({ ...initialState, brand: 'newsprint' }),
    );

    const service = createService();

    expect(service.brand()).toBe('newsprint');
    expect(root().getAttribute('data-brand')).toBe('newsprint');
  });

  it('should show the default look for a brand saved before it was retired', () => {
    localStorage.setItem(
      stateStorageKey('appState'),
      JSON.stringify({ ...initialState, brand: 'retired' }),
    );

    const service = createService();

    expect(service.brand()).toBe('modern');
    expect(root().getAttribute('data-brand')).toBe('modern');
  });

  it("should take the account's brand once its record arrives", () => {
    const service = createService();
    clerk.isLoggedIn.set(true);
    clerk.isLoaded.set(true);

    user.set(record);
    TestBed.tick();

    expect(service.brand()).toBe('classic');
  });

  it('should keep a newly chosen brand while the record still holds the old one', () => {
    const service = createService();
    clerk.isLoggedIn.set(true);
    clerk.isLoaded.set(true);
    user.set(record);
    TestBed.tick();

    service.change('sunset');
    TestBed.tick();

    expect(service.brand()).toBe('sunset');
  });

  it('should show a visitor the default look', () => {
    const service = createService();
    service.change('sunset');
    TestBed.tick();

    clerk.isLoaded.set(true);
    TestBed.tick();

    expect(service.brand()).toBe('modern');
  });

  it('should keep the brand last shown until the session is known', () => {
    const service = createService();

    service.change('sunset');
    TestBed.tick();

    expect(service.brand()).toBe('sunset');
  });
});
