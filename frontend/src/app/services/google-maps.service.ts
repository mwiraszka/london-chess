import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import { Injectable } from '@angular/core';

import { environment } from '@env';

/**
 * Loads Google Maps libraries. The loader's options are global and may only be set
 * once, so every map loads its libraries through this one service.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsService {
  public readonly importLibrary = importLibrary;

  constructor() {
    setOptions({
      key: environment.googleMapsApiKey,
      v: 'weekly',
    });
  }
}
