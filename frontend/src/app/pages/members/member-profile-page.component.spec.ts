import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { UserRecord } from '@app/models';
import { MetaAndTitleService, UserService } from '@app/services';
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
  const userRecord = signal<UserRecord | null>(null);

  beforeEach(async () => {
    userRecord.set(null);

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
        { provide: UserService, useValue: { user: userRecord.asReadonly() } },
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

  it('should request the member by number on init', () => {
    expect(dispatchSpy).toHaveBeenCalledWith(
      MembersActions.fetchMemberByNumberRequested({ memberNumber: 0 }),
    );
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

    userRecord.set({
      id: 'user_1',
      memberNumber: member.number,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      isAdmin: true,
      clerkImageUrl: null,
      avatarUrl: null,
      avatarOriginalUrl: null,
      avatarCropState: null,
      avatarUpdatedAt: null,
    });
    TestBed.tick();
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.details-card .privacy-note a')).toBeTruthy();
  });

  it('should render the rating progression placeholder', () => {
    expect(query(fixture.debugElement, '.rating-progression-placeholder')).toBeTruthy();
  });
});
