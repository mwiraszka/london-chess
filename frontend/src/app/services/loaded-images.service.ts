import { Injectable } from '@angular/core';

import { Url } from '@app/models';

/**
 * The full-size images the page has finished loading, which can then show at once,
 * without a placeholder or a blurred preview.
 */
@Injectable({ providedIn: 'root' })
export class LoadedImagesService {
  private readonly urls = new Set<Url>();

  public add(url: Url): void {
    this.urls.add(url);
  }

  public has(url: Url): boolean {
    return this.urls.has(url);
  }
}
