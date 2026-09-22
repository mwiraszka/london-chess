import { provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MetaAndTitleService } from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { query } from '@app/utils';

import { ChampionPageComponent } from './champion-page.component';

describe('ChampionPageComponent', () => {
  let fixture: ComponentFixture<ChampionPageComponent>;
  let component: ChampionPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChampionPageComponent],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        provideRouter([]),
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChampionPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should set meta title and description', () => {
      component.ngOnInit();

      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('City Champion');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should always render page header and all page sections', () => {
      expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
      expect(
        query(fixture.debugElement, '.history-and-photos-section .history'),
      ).toBeTruthy();
      expect(
        query(fixture.debugElement, '.history-and-photos-section lcc-photo-carousel'),
      ).toBeTruthy();
      expect(
        query(fixture.debugElement, '.past-champions-section .standard-championship'),
      ).toBeTruthy();
      expect(
        query(fixture.debugElement, '.past-champions-section .other-championships'),
      ).toBeTruthy();
    });

    it("should not render 'other championships' tables by default", () => {
      expect(query(fixture.debugElement, '.junior-champions table')).toBeFalsy();
      expect(query(fixture.debugElement, '.active-champions table')).toBeFalsy();
      expect(query(fixture.debugElement, '.speed-champions table')).toBeFalsy();
    });

    it("should render 'other championships' tables when expansion panels are clicked", () => {
      const juniorPanelHeader = query(
        fixture.debugElement,
        '.junior-champions .expansion-header',
      );
      juniorPanelHeader.triggerEventHandler('click');
      fixture.detectChanges();
      expect(query(fixture.debugElement, '.junior-champions table')).toBeTruthy();

      const activePanelHeader = query(
        fixture.debugElement,
        '.active-champions .expansion-header',
      );
      activePanelHeader.triggerEventHandler('click');
      fixture.detectChanges();
      expect(query(fixture.debugElement, '.active-champions table')).toBeTruthy();

      const speedPanelHeader = query(
        fixture.debugElement,
        '.speed-champions .expansion-header',
      );
      speedPanelHeader.triggerEventHandler('click');
      fixture.detectChanges();
      expect(query(fixture.debugElement, '.speed-champions table')).toBeTruthy();
    });
  });

  describe('component data properties', () => {
    it('should have photos array with expected length', () => {
      expect(component.photos.length).toBe(5);
    });

    it('should have populated championship data arrays', () => {
      expect(component.standardChampionships.length).toBeGreaterThan(0);
      expect(component.activeChampionships.length).toBeGreaterThan(0);
      expect(component.juniorChampionships.length).toBeGreaterThan(0);
      expect(component.speedChampionships.length).toBeGreaterThan(0);
    });
  });
});
