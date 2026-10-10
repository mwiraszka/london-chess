import { applyPalette, derivePalette } from '@eagami/ui';
import { Store } from '@ngrx/store';

import { DOCUMENT, Injectable, computed, effect, inject, untracked } from '@angular/core';

import { BRANDS, DEFAULT_BRAND } from '@app/constants/brands';
import { Brand, BrandDefinition, Url } from '@app/models';
import { ClerkService } from '@app/services/clerk.service';
import { UserService } from '@app/services/user.service';
import { AppActions, AppSelectors } from '@app/store/app';
import { isBrand } from '@app/utils';

const STYLESHEET_ID = 'lcc-brand-fonts';

/**
 * Dresses the site in the brand its member chose on their account: the colours the
 * library derives from the brand's two base colours, and the type its data-brand
 * attribute selects.
 */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly clerk = inject(ClerkService);
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(Store);
  private readonly userService = inject(UserService);

  private readonly savedBrand = this.store.selectSignal(AppSelectors.selectBrand);

  // A brand saved before it was retired shows as the default
  public readonly brand = computed(() => {
    const brand = this.savedBrand();
    return isBrand(brand) ? brand : DEFAULT_BRAND;
  });

  private requestedBrand: Brand | null = null;

  // Settles once the brand the visit was left in shows, which the first page waits for
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.apply(this.brand());

    // The account's choice wins once its record arrives, and visitors see the club's own
    // look; until the session is known, the brand last shown on this device stays
    effect(() => {
      if (!this.clerk.isLoaded()) {
        return;
      }
      const brand = this.clerk.isLoggedIn()
        ? this.userService.user()?.brand
        : DEFAULT_BRAND;
      if (brand) {
        untracked(() => this.change(brand));
      }
    });

    effect(() => void this.apply(this.brand()));
  }

  public change(brand: Brand): void {
    if (brand !== this.brand()) {
      this.store.dispatch(AppActions.brandChanged({ brand }));
    }
  }

  // A brand shows only once its fonts are ready, so its text is never drawn in a
  // stand-in face first and moved when the real one arrives
  private async apply(brand: Brand): Promise<void> {
    if (brand === this.requestedBrand) {
      return;
    }
    this.requestedBrand = brand;
    const { palette, stylesheet }: BrandDefinition = BRANDS[brand];

    const fonts = stylesheet ? await this.loadFonts(stylesheet) : null;
    if (brand !== this.requestedBrand) {
      fonts?.remove();
      return;
    }

    this.document.getElementById(STYLESHEET_ID)?.remove();
    if (fonts) {
      fonts.id = STYLESHEET_ID;
    }
    applyPalette(derivePalette(palette));
    this.document.documentElement.setAttribute('data-brand', brand);
  }

  // Settles once the stylesheet's faces for Latin text have loaded, or failed to
  private async loadFonts(stylesheet: Url): Promise<HTMLLinkElement> {
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    const settled = new Promise<void>(resolve => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
    this.document.head.append(link);
    await settled;

    const families = new Set(
      new URL(stylesheet).searchParams
        .getAll('family')
        .map(family => family.split(':')[0]),
    );
    const fonts = new Set(
      [...this.document.fonts].flatMap(face => {
        const family = face.family.replace(/^["']|["']$/g, '');
        return families.has(family)
          ? [`${face.style} ${face.weight.split(' ')[0]} 1em "${family}"`]
          : [];
      }),
    );
    await Promise.allSettled([...fonts].map(font => this.document.fonts.load(font, 'a')));
    return link;
  }
}
