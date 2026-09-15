import { ComponentFixture, TestBed } from '@angular/core/testing';

import { REGIONAL_CLUBS } from '@app/constants/clubs';
import { MetaAndTitleService } from '@app/services';
import { query, queryAll } from '@app/utils';

import { RegionalClubsPageComponent } from './regional-clubs-page.component';

describe('RegionalClubsPageComponent', () => {
  let fixture: ComponentFixture<RegionalClubsPageComponent>;
  let component: RegionalClubsPageComponent;

  let metaAndTitleService: MetaAndTitleService;

  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegionalClubsPageComponent],
      providers: [
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegionalClubsPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);

    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should set meta title and description', () => {
      component.ngOnInit();

      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('Regional Clubs');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
      expect(updateDescriptionSpy).toHaveBeenCalledWith(
        'Discover other chess clubs in the region.',
      );
    });

    it('should have REGIONAL_CLUBS constant available', () => {
      expect(component.REGIONAL_CLUBS).toEqual(REGIONAL_CLUBS);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render page header', () => {
      const pageHeader = query(fixture.debugElement, 'lcc-page-header');
      expect(pageHeader).toBeTruthy();
    });

    it('should render a club card for each regional club', () => {
      const clubCards = queryAll(fixture.debugElement, 'lcc-club-card');
      expect(clubCards.length).toBe(REGIONAL_CLUBS.length);
    });

    it('should pass correct club data to each club card', () => {
      const clubCards = queryAll(fixture.debugElement, 'lcc-club-card');

      clubCards.forEach((clubCard, index) => {
        expect(clubCard.componentInstance.club).toEqual(REGIONAL_CLUBS[index]);
      });
    });
  });
});
