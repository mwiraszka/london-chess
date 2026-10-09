import { derivePalette, validatePalette } from '@eagami/ui';
import { provideState, provideStore } from '@ngrx/store';
import type { Mock } from 'vitest';

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BRANDS } from '@app/constants/brands';
import { Brand, UserRecord } from '@app/models';
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
  let loadFont: Mock<(font: string, text: string) => Promise<FontFace[]>>;

  // The faces the stylesheets declare, as the browser lists them once they have loaded
  const faces: Pick<FontFace, 'family' | 'style' | 'weight'>[] = [
    { family: 'DM Sans', style: 'normal', weight: '300 600' },
    { family: 'Fredoka', style: 'normal', weight: '300 600' },
    { family: '"Chewy"', style: 'normal', weight: '400' },
  ];

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
    notifyRatingChanges: true,
    notifyScheduleChanges: true,
  };

  const root = () => document.documentElement;
  const fontsLink = () => document.querySelector<HTMLLinkElement>('#lcc-brand-fonts');
  const paletteCss = () => document.querySelector('#eagami-palette')?.textContent ?? '';

  // Everything left to run is already queued as microtasks, which a turn of the event
  // loop drains in full
  const drainMicrotasks = () => new Promise(resolve => setTimeout(resolve));

  const finishLoadingFonts = async (brand: Brand, event = 'load'): Promise<void> => {
    document
      .querySelector(`link[href="${BRANDS[brand].stylesheet}"]`)
      ?.dispatchEvent(new Event(event));
    await drainMicrotasks();
  };

  // Created by each test, so one can save a state for it to start from first
  const createService = (): BrandService => TestBed.inject(BrandService);

  beforeEach(() => {
    localStorage.clear();
    clerk = { isLoaded: signal(false), isLoggedIn: signal(false) };
    user = signal(null);
    loadFont = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { [Symbol.iterator]: () => faces[Symbol.iterator](), load: loadFont },
    });

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
    document.head.querySelectorAll('link').forEach(link => link.remove());
    root().removeAttribute('data-brand');
    Reflect.deleteProperty(document, 'fonts');
  });

  it.each(Object.entries(BRANDS))(
    'should derive colours from the %s brand that pass the contrast checks',
    (_, { palette }) => {
      const violations = validatePalette(derivePalette(palette));

      expect(violations).toEqual([]);
    },
  );

  it("should dress the site in a brand's colours and fonts once they have loaded", async () => {
    const service = createService();

    service.change('playground');
    TestBed.tick();
    await finishLoadingFonts('playground');

    const { palette, stylesheet } = BRANDS.playground;
    expect(loadFont.mock.calls).toEqual([
      ['normal 300 1em "Fredoka"', 'a'],
      ['normal 400 1em "Chewy"', 'a'],
    ]);
    expect(paletteCss()).toContain(derivePalette(palette).light['--color-brand-default']);
    expect(root().getAttribute('data-brand')).toBe('playground');
    expect(fontsLink()?.href).toBe(stylesheet);
  });

  it('should keep the current brand until the next one has its fonts', () => {
    const service = createService();

    service.change('playground');
    TestBed.tick();

    expect(root().getAttribute('data-brand')).toBe('modern');
    expect(fontsLink()).toBeNull();
  });

  it('should show a brand whose fonts could not be had in its stand-in faces', async () => {
    const service = createService();

    service.change('sunset');
    TestBed.tick();
    await finishLoadingFonts('sunset', 'error');

    expect(root().getAttribute('data-brand')).toBe('sunset');
  });

  it('should show the brand chosen last when an earlier one finishes loading after it', async () => {
    const service = createService();
    service.change('playground');
    TestBed.tick();
    service.change('sunset');
    TestBed.tick();

    await finishLoadingFonts('sunset');
    await finishLoadingFonts('playground');

    expect(root().getAttribute('data-brand')).toBe('sunset');
    expect(fontsLink()?.href).toBe(BRANDS.sunset.stylesheet);
    expect(
      document.querySelector(`link[href="${BRANDS.playground.stylesheet}"]`),
    ).toBeNull();
  });

  it("should drop the other brands' fonts for the default look", async () => {
    const service = createService();
    service.change('playground');
    TestBed.tick();
    await finishLoadingFonts('playground');

    service.change('modern');
    TestBed.tick();

    expect(root().getAttribute('data-brand')).toBe('modern');
    expect(fontsLink()).toBeNull();
  });

  it('should open in the brand last shown in this browser, its fonts ready', async () => {
    localStorage.setItem(
      stateStorageKey('appState'),
      JSON.stringify({ ...initialState, brand: 'newsprint' }),
    );

    const service = createService();
    await finishLoadingFonts('newsprint');
    await service.ready;

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
