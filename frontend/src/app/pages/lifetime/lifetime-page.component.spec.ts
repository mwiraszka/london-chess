import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemberProfile } from '@app/models';
import { MemberProfilesService, MetaAndTitleService } from '@app/services';
import { query, queryAll } from '@app/utils';

import { LifetimePageComponent } from './lifetime-page.component';

describe('LifetimePageComponent', () => {
  let fixture: ComponentFixture<LifetimePageComponent>;
  let component: LifetimePageComponent;

  let metaAndTitleService: MetaAndTitleService;

  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const profile: MemberProfile = {
    number: 2,
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
  };
  const memberProfiles: Pick<MemberProfilesService, 'load' | 'profileFor'> = {
    load: () => Promise.resolve(),
    profileFor: (number: number | null) => (number === 2 ? profile : null),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifetimePageComponent],
      providers: [
        provideRouter([]),
        { provide: MemberProfilesService, useValue: memberProfiles },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LifetimePageComponent);
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
      expect(updateTitleSpy).toHaveBeenCalledWith('Lifetime');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('constants', () => {
    it('should have correct IMAGE_PATH', () => {
      expect(component.IMAGE_PATH).toBe('assets/lifetime-achievement-awards/');
    });

    it('should list recipients under each year, newest first', () => {
      const years = [...component.RECIPIENTS_MAP.keys()];

      expect(years).toEqual([...years].sort((a, b) => b - a));
      expect(years.length).toBeGreaterThan(0);
      component.RECIPIENTS_MAP.forEach(recipients => {
        expect(recipients.length).toBeGreaterThan(0);
        recipients.forEach(recipient => expect(recipient).toMatch(/^\S+ \S+/));
      });
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render page header', () => {
      expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
    });

    it('should render intro section', () => {
      expect(query(fixture.debugElement, '.intro-section')).toBeTruthy();
    });

    it('should render recipients sections for each year', () => {
      expect(queryAll(fixture.debugElement, '.recipients-section')).toHaveLength(3);
    });

    it('should render recipients for each year', () => {
      const recipients = queryAll(fixture.debugElement, '.recipient');
      const expectedTotal =
        component.RECIPIENTS_MAP.get(2025)!.length +
        component.RECIPIENTS_MAP.get(2024)!.length +
        component.RECIPIENTS_MAP.get(2023)!.length;

      expect(recipients).toHaveLength(expectedTotal);
    });

    it('should link only a recipient with a profile to their profile page', () => {
      const links = queryAll(fixture.debugElement, 'a.recipient');

      expect(links).toHaveLength(1);
      expect(links[0].attributes['href']).toBe('/members/2');
    });
  });
});
