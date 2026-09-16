import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MetaAndTitleService } from '@app/services';
import { initialState as authInitialState } from '@app/store/auth/auth.reducer';
import { MembersSelectors } from '@app/store/members';
import { query, queryAll, queryTextContent } from '@app/utils';

import { MemberProfilePageComponent } from './member-profile-page.component';

describe('MemberProfilePageComponent', () => {
  let fixture: ComponentFixture<MemberProfilePageComponent>;
  let component: MemberProfilePageComponent;
  let store: MockStore;

  const member = {
    ...MOCK_MEMBERS[0],
    isActive: true,
    isAdmin: false,
    showYearOfBirth: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberProfilePageComponent],
      providers: [
        provideMockStore({ initialState: { authState: authInitialState } }),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ number: String(member.number) })),
          },
        },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(MembersSelectors.selectAllMembers, [member]);

    fixture = TestBed.createComponent(MemberProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the member name and ratings', () => {
    expect(queryTextContent(fixture.debugElement, '.member-name__first')).toBe(
      member.firstName,
    );
    expect(queryTextContent(fixture.debugElement, '.member-name__last')).toBe(
      member.lastName,
    );

    expect(queryTextContent(fixture.debugElement, '.rating__value')).toBe(member.rating);

    const statValues = queryAll(fixture.debugElement, '.stat__value').map(el =>
      el.nativeElement.textContent.trim(),
    );
    expect(statValues).toEqual([member.peakRating, member.city, member.yearOfBirth]);
  });

  it('should hide the year of birth when the member has not chosen to show it', () => {
    store.overrideSelector(MembersSelectors.selectAllMembers, [
      { ...member, showYearOfBirth: false },
    ]);
    store.refreshState();

    fixture.detectChanges();

    const statValues = queryAll(fixture.debugElement, '.stat__value').map(el =>
      el.nativeElement.textContent.trim(),
    );
    expect(statValues).toEqual([member.peakRating, member.city]);
  });

  it('should not render the admin icon for non-admin members', () => {
    expect(query(fixture.debugElement, '.admin-icon')).toBeFalsy();
  });

  it('should render the admin icon for admin members', () => {
    store.overrideSelector(MembersSelectors.selectAllMembers, [
      { ...member, isAdmin: true },
    ]);
    store.refreshState();

    fixture.detectChanges();

    expect(query(fixture.debugElement, '.admin-icon')).toBeTruthy();
  });

  it('should render the rating progression placeholder', () => {
    expect(query(fixture.debugElement, '.rating-progression-placeholder')).toBeTruthy();
  });
});
