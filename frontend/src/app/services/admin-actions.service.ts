import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';

import { AdminAction } from '@app/models';

// Collects what each view on screen offers an admin, for the one admin actions menu
@Injectable({ providedIn: 'root' })
export class AdminActionsService {
  private readonly sources = signal<ReadonlyArray<Signal<AdminAction[]>>>([]);

  public readonly actions = computed(() => this.sources().flatMap(source => source()));

  /**
   * Lists `actions` in the admin actions menu for as long as the calling view lives,
   * after those of views registered before it. Call it from an injection context.
   */
  public register(actions: () => AdminAction[]): void {
    const source = computed(actions);
    this.sources.update(sources => [...sources, source]);
    inject(DestroyRef).onDestroy(() =>
      this.sources.update(sources => sources.filter(existing => existing !== source)),
    );
  }
}
