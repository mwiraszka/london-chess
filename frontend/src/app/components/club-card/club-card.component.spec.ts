import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LCC, REGIONAL_CLUBS } from '@app/constants/clubs';
import { query } from '@app/utils';

import { ClubCardComponent } from './club-card.component';

describe('ClubCardComponent', () => {
  let component: ClubCardComponent;
  let fixture: ComponentFixture<ClubCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('club', LCC);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render club name', () => {
      const clubName = query(fixture.debugElement, '.club-name');
      expect(clubName?.nativeElement.textContent).toContain(LCC.name);
    });

    it('should render address', () => {
      const address = query(fixture.debugElement, '.address .address');
      const addressText = address?.nativeElement.textContent;

      expect(addressText).toContain(LCC.addressLine1);
      expect(addressText).toContain(LCC.addressLine2);
      expect(addressText).toContain(LCC.addressLine3);
    });

    it('should render schedule text', () => {
      const schedule = query(fixture.debugElement, '.schedule');
      expect(schedule?.nativeElement.textContent).toContain(LCC.scheduleText);
    });

    it('should render email link when email is provided', () => {
      const emailLink = query(fixture.debugElement, '.email-link');

      expect(emailLink).toBeTruthy();
      expect(emailLink?.nativeElement.getAttribute('href')).toBe(`mailto:${LCC.email}`);
      expect(emailLink?.nativeElement.textContent).toContain(LCC.email);
    });

    it('should not render email section when email is not provided', () => {
      fixture.componentRef.setInput(
        'club',
        REGIONAL_CLUBS.find(club => !club.email),
      );
      fixture.detectChanges();

      const emailSection = query(fixture.debugElement, '.email');
      expect(emailSection).toBeFalsy();
    });

    it('should render club map component', () => {
      const clubMap = query(fixture.debugElement, 'lcc-club-map');
      expect(clubMap).toBeTruthy();
    });

    it('should render location icon', () => {
      expect(query(fixture.debugElement, 'ea-icon-map-pin')).toBeTruthy();
    });

    it('should render email icon when email exists', () => {
      expect(query(fixture.debugElement, 'ea-icon-mail')).toBeTruthy();
    });

    it('should render external link icon when email exists', () => {
      expect(query(fixture.debugElement, 'ea-icon-external-link')).toBeTruthy();
    });
  });
});
