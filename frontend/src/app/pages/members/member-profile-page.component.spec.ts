import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MetaAndTitleService } from '@app/services';
import { initialState as authInitialState } from '@app/store/auth/auth.reducer';
import {
  MembersActions,
  MembersSelectors,
  initialState as membersInitialState,
} from '@app/store/members';
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
        provideMockStore({
          initialState: {
            authState: authInitialState,
            membersState: membersInitialState,
          },
        }),
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

  it('should not render skeletons once the member has loaded', () => {
    expect(queryAll(fixture.debugElement, 'ea-skeleton')).toHaveLength(0);
    expect(query(fixture.debugElement, '.profile').attributes['aria-busy']).toBe('false');
  });

  it('should cover each card with a skeleton while the member loads', () => {
    store.overrideSelector(MembersSelectors.selectAllMembers, []);
    store.refreshState();

    fixture.detectChanges();

    const cards = queryAll(fixture.debugElement, '.profile-card');
    expect(cards).toHaveLength(2);
    cards.forEach(card => {
      expect(query(card, 'ea-card')).toBeTruthy();
      expect(query(card, 'ea-skeleton')).toBeTruthy();
    });
    expect(query(fixture.debugElement, '.profile--loading')).toBeTruthy();
    expect(query(fixture.debugElement, '.profile').attributes['aria-busy']).toBe('true');
  });

  it('should render the rating progression placeholder', () => {
    expect(query(fixture.debugElement, '.rating-progression-placeholder')).toBeTruthy();
  });

  describe('when the member fails to load', () => {
    beforeEach(() => {
      store.setState({
        authState: authInitialState,
        membersState: { ...membersInitialState, failedLoads: ['member'] },
      });
      store.overrideSelector(MembersSelectors.selectAllMembers, []);
      store.refreshState();

      fixture.detectChanges();
    });

    it('should render a failure panel in place of the profile cards', () => {
      expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
      expect(query(fixture.debugElement, '.profile')).toBeFalsy();
      expect(query(fixture.debugElement, 'ea-skeleton')).toBeFalsy();
    });

    it('should fetch the member again on retry', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.fetchMemberByNumberRequested({
          memberNumber: Number(member.number),
        }),
      );
    });
  });

  it('should keep showing a loaded member when a later refresh fails', () => {
    store.setState({
      authState: authInitialState,
      membersState: { ...membersInitialState, failedLoads: ['member'] },
    });
    store.refreshState();

    fixture.detectChanges();

    expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
    expect(queryTextContent(fixture.debugElement, '.member-name__first')).toBe(
      member.firstName,
    );
  });
});
