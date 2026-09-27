import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LCC } from '@app/constants/clubs';
import { query } from '@app/utils';

import { ClubMapComponent } from './club-map.component';

interface Libraries {
  maps: Promise<{ Map: Mock }>;
  marker: Promise<{ AdvancedMarkerElement: Mock }>;
}

const libraries = vi.hoisted((): Partial<Libraries> => ({}));

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn((name: keyof Libraries) => libraries[name]),
}));

describe('ClubMapComponent', () => {
  let fixture: ComponentFixture<ClubMapComponent>;
  let initMapSpy: MockInstance;

  const mapConstructor = vi.fn();
  const markerConstructor = vi.fn();

  let mapsLibrary: Libraries['maps'];
  let markerLibrary: Libraries['marker'];

  const render = async (): Promise<void> => {
    libraries.maps = mapsLibrary;
    libraries.marker = markerLibrary;
    fixture = TestBed.createComponent(ClubMapComponent);
    fixture.componentRef.setInput('club', LCC);
    // @ts-expect-error Private class member
    initMapSpy = vi.spyOn(fixture.componentInstance, 'initMap');
    fixture.detectChanges();
    await initMapSpy.mock.results[0].value;
  };

  beforeEach(async () => {
    mapConstructor.mockReset();
    markerConstructor.mockReset();
    mapsLibrary = Promise.resolve({ Map: mapConstructor });
    markerLibrary = Promise.resolve({ AdvancedMarkerElement: markerConstructor });

    await TestBed.configureTestingModule({
      imports: [ClubMapComponent],
    }).compileComponents();
  });

  it('should load the Maps API with the API key', async () => {
    await render();

    expect(setOptions).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.any(String), v: 'weekly' }),
    );
  });

  it('should link the map to the club location', async () => {
    await render();

    expect(query(fixture.debugElement, 'a').nativeElement.getAttribute('href')).toBe(
      LCC.mapUrl,
    );
    expect(query(fixture.debugElement, `#${LCC.id}-location`)).not.toBeNull();
  });

  it('should draw a map centred on the club, with a marker on it', async () => {
    await render();
    await markerLibrary;

    expect(mapConstructor).toHaveBeenCalledWith(
      query(fixture.debugElement, `#${LCC.id}-location`).nativeElement,
      expect.objectContaining({ center: LCC.location, mapId: `${LCC.id}-location` }),
    );
    expect(markerConstructor).toHaveBeenCalledWith({
      map: mapConstructor.mock.instances[0],
      position: LCC.location,
    });
  });

  it('should report a map that fails to load and add no marker', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mapsLibrary = Promise.reject(new Error('offline'));

    await render();

    expect(errorSpy).toHaveBeenCalledWith(
      '[LCC] Error creating Google Maps map: Error: offline',
    );
    expect(importLibrary).not.toHaveBeenCalledWith('marker');
  });

  it('should report a marker that fails to load', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    markerLibrary = Promise.reject(new Error('offline'));

    await render();
    await markerLibrary.catch(() => undefined);

    expect(errorSpy).toHaveBeenCalledWith(
      '[LCC] Error creating Google Maps advanced marker: Error: offline',
    );
  });
});
