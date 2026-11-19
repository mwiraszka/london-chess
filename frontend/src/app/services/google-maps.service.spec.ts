import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import { TestBed } from '@angular/core/testing';

import { environment } from '@env';

import { GoogleMapsService } from './google-maps.service';

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(),
}));

describe('GoogleMapsService', () => {
  it('should set the Maps API options once, however many libraries load', () => {
    const googleMaps = TestBed.inject(GoogleMapsService);

    googleMaps.importLibrary('maps');
    googleMaps.importLibrary('marker');
    TestBed.inject(GoogleMapsService).importLibrary('maps');

    expect(setOptions).toHaveBeenCalledExactlyOnceWith({
      key: environment.googleMapsApiKey,
      v: 'weekly',
    });
    expect(importLibrary).toHaveBeenCalledTimes(3);
  });
});
