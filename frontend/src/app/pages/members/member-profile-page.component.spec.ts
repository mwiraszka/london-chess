import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MetaAndTitleService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { initialState as authInitialState } from '@app/store/auth/auth.reducer';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { initialState } from '@app/store/members/members.reducer';
import { query, queryAll, queryTextContent } from '@app/utils';

import { MemberProfilePageComponent } from './member-profile-page.component';

describe('MemberProfilePageComponent', () => {
  let fixture: ComponentFixture<MemberProfilePageComponent>;
  let component: MemberProfilePageComponent;
  let store: MockStore;
  let dispatchSpy: MockInstance;

  const member = {
    ...MOCK_MEMBERS[0],
    isActive: true,
    isAdmin: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberProfilePageComponent],
      providers: [
        provideMockStore({ initialState: { authState: authInitialState } }),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: member.id })) },
        },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(MembersSelectors.selectAllMembers, [member]);
    store.overrideSelector(MembersSelectors.selectCallState, initialState.callState);
    store.overrideSelector(AuthSelectors.selectIsAdmin, false);
    dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(MemberProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request the member on init', () => {
    expect(dispatchSpy).toHaveBeenCalledWith(
      MembersActions.fetchMemberRequested({ memberId: member.id }),
    );
  });

  it('should render the member name and ratings', () => {
    expect(queryTextContent(fixture.debugElement, '.member-name')).toContain(
      `${member.firstName} ${member.lastName}`,
    );

    expect(queryTextContent(fixture.debugElement, '.primary-rating__value')).toBe(
      member.rating,
    );

    const secondaryValues = queryAll(fixture.debugElement, '.secondary-stat__value').map(
      el => el.nativeElement.textContent.trim(),
    );
    expect(secondaryValues).toEqual([member.peakRating, member.city]);
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

  it('should hide the private details card from non-admin viewers', () => {
    expect(query(fixture.debugElement, '.details-card')).toBeFalsy();
  });

  it('should show the private details card to admin viewers', () => {
    store.overrideSelector(AuthSelectors.selectIsAdmin, true);
    store.refreshState();

    fixture.detectChanges();

    expect(query(fixture.debugElement, '.details-card')).toBeTruthy();
    expect(queryTextContent(fixture.debugElement, '.details-card dd')).toBe(member.email);
    expect(query(fixture.debugElement, '.details-card .privacy-note')).toBeTruthy();
  });

  it('should only offer the account page link on your own profile', () => {
    store.overrideSelector(AuthSelectors.selectIsAdmin, true);
    store.refreshState();
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.details-card .privacy-note a')).toBeFalsy();

    store.overrideSelector(AuthSelectors.selectUser, {
      id: 'user_1',
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      isAdmin: true,
    });
    store.refreshState();
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.details-card .privacy-note a')).toBeTruthy();
  });

  it('should render the rating progression placeholder', () => {
    expect(query(fixture.debugElement, '.rating-progression-placeholder')).toBeTruthy();
  });
});
