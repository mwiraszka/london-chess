import { applyPalette, derivePalette } from '@eagami/ui';
import { Store } from '@ngrx/store';

import { DOCUMENT, Injectable, computed, effect, inject, untracked } from '@angular/core';

import { BRANDS, DEFAULT_BRAND } from '@app/constants/brands';
import { Brand, BrandDefinition } from '@app/models';
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

  private appliedBrand: Brand | null = null;
  // A brand applied as a page loads must not reflow it when its fonts arrive, so they
  // show only if ready in time; one a member has just chosen shows its fonts as soon as
  // they arrive
  private fontDisplay: 'optional' | 'swap' = 'optional';

  constructor() {
    // At once rather than on the effect's first run, so the first page paints in it
    this.apply(this.brand());

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

    effect(() => this.apply(this.brand()));
  }

  public change(brand: Brand, { chosen = false }: { chosen?: boolean } = {}): void {
    if (brand !== this.brand()) {
      this.fontDisplay = chosen ? 'swap' : 'optional';
      this.store.dispatch(AppActions.brandChanged({ brand }));
    }
  }

  private apply(brand: Brand): void {
    if (brand === this.appliedBrand) {
      return;
    }
    this.appliedBrand = brand;
    const { palette, stylesheet }: BrandDefinition = BRANDS[brand];

    applyPalette(derivePalette(palette));
    this.document.documentElement.setAttribute('data-brand', brand);

    this.document.getElementById(STYLESHEET_ID)?.remove();
    if (stylesheet) {
      const link = this.document.createElement('link');
      link.id = STYLESHEET_ID;
      link.rel = 'stylesheet';
      link.href = `${stylesheet}&display=${this.fontDisplay}`;
      this.document.head.append(link);
    }
  }
}
