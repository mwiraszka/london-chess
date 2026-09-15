import { setOptions } from '@googlemaps/js-api-loader';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LCC } from '@app/constants/clubs';
import { query } from '@app/utils';

import { ClubMapComponent } from './club-map.component';

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi
    .fn()
    .mockResolvedValue({ Map: vi.fn(), AdvancedMarkerElement: vi.fn() }),
}));

describe('ClubMapComponent', () => {
  let component: ClubMapComponent;
  let fixture: ComponentFixture<ClubMapComponent>;

  let initMapSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubMapComponent);
    component = fixture.componentInstance;
    component.club = LCC;

    // @ts-expect-error Private class member
    initMapSpy = vi.spyOn(component, 'initMap').mockResolvedValue();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should call setOptions with the Google Maps API key in ngOnInit', () => {
      component.ngOnInit();

      expect(setOptions).toHaveBeenCalledWith(
        expect.objectContaining({ key: expect.any(String), v: 'weekly' }),
      );
    });

    it('should call initMap on ngAfterViewInit', () => {
      component.ngAfterViewInit();

      expect(initMapSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    it('should render an anchor element with the correct href', () => {
      fixture.detectChanges();

      const anchor = query(fixture.debugElement, 'a');
      expect(anchor).toBeTruthy();
      expect(anchor?.nativeElement.getAttribute('href')).toBe(LCC.mapUrl);
    });

    it('should render the club map div element with dynamic id', () => {
      fixture.detectChanges();

      expect(query(fixture.debugElement, `#${LCC.id}-location`)).toBeTruthy();
    });
  });
});
