import { AvatarComponent, BadgeComponent } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { MemberTournamentsComponent } from '@app/components/member-tournaments/member-tournaments.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { Member } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { initialState as authInitialState } from '@app/store/auth/auth.reducer';
import {
  MembersActions,
  MembersSelectors,
  initialState as membersInitialState,
} from '@app/store/members';
import { initialState as tournamentsInitialState } from '@app/store/tournaments';
import { CITY_CHAMPION, query, queryAll, queryTextContent } from '@app/utils';

import { MemberProfilePageComponent } from './member-profile-page.component';

describe('MemberProfilePageComponent', () => {
  let fixture: ComponentFixture<MemberProfilePageComponent>;
  let store: MockStore;
  let paramMap: BehaviorSubject<ParamMap>;
  let metaAndTitleService: Mocked<
    Pick<MetaAndTitleService, 'updateTitle' | 'updateDescription'>
  >;

  const member: Member = {
    ...MOCK_MEMBERS[0],
    number: 7,
    isActive: true,
    isAdmin: false,
    showYearOfBirth: true,
    yearJoined: undefined,
  };

  const statValues = (): string[] =>
    queryAll(fixture.debugElement, '.stat__value').map(el =>
      el.nativeElement.textContent.trim(),
    );

  function showMember(overrides: Partial<Member>): void {
    store.overrideSelector(MembersSelectors.selectAllMembers, [
      { ...member, ...overrides },
    ]);
    store.refreshState();
    fixture.detectChanges();
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(MemberProfilePageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    metaAndTitleService = { updateTitle: vi.fn(), updateDescription: vi.fn() };
    paramMap = new BehaviorSubject(convertToParamMap({ number: String(member.number) }));

    TestBed.configureTestingModule({
      imports: [MemberProfilePageComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: {
            authState: authInitialState,
            membersState: membersInitialState,
            tournamentsState: tournamentsInitialState,
          },
        }),
        {
          provide: ActivatedRoute,
          useValue: { paramMap },
        },
        { provide: MetaAndTitleService, useValue: metaAndTitleService },
      ],
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(MembersSelectors.selectAllMembers, [member]);
  });

  describe('once the member has loaded', () => {
    beforeEach(() => {
      createComponent();
    });

    it('should set the page title and description', () => {
      expect(metaAndTitleService.updateTitle).toHaveBeenCalledWith('Member Profile');
      expect(metaAndTitleService.updateDescription).toHaveBeenCalled();
    });

    it("should list the member's tournaments", () => {
      const tournaments: MemberTournamentsComponent = query(
        fixture.debugElement,
        'lcc-member-tournaments',
      ).componentInstance;

      expect(tournaments.memberNumber()).toBe(member.number);
    });

    it('should render the member name, avatar and ratings', () => {
      const avatar: AvatarComponent = query(
        fixture.debugElement,
        'ea-avatar',
      ).componentInstance;

      expect(queryTextContent(fixture.debugElement, '.member-name__first')).toBe(
        member.firstName,
      );
      expect(queryTextContent(fixture.debugElement, '.member-name__last')).toBe(
        member.lastName,
      );
      expect(avatar.initials()).toBe('MC');
      expect(avatar.src()).toBeUndefined();
      expect(queryTextContent(fixture.debugElement, '.rating__value')).toBe(
        member.rating,
      );
      expect(statValues()).toEqual([member.peakRating, member.city, member.yearOfBirth]);
    });

    it('should show the uploaded avatar when there is one', () => {
      showMember({ avatarUrl: 'https://example.com/avatar.png', firstName: '' });

      const avatar: AvatarComponent = query(
        fixture.debugElement,
        'ea-avatar',
      ).componentInstance;
      expect(avatar.src()).toBe('https://example.com/avatar.png');
      expect(avatar.initials()).toBe('C');
    });

    it('should hide the year of birth when the member has not chosen to show it', () => {
      showMember({ showYearOfBirth: false });

      expect(statValues()).toEqual([member.peakRating, member.city]);
      expect(queryAll(fixture.debugElement, '.stats__pair')).toHaveLength(1);
    });

    it('should show the year the member joined', () => {
      showMember({ yearJoined: '2015', city: '' });

      expect(statValues()).toEqual([member.peakRating, '2015', member.yearOfBirth]);
    });

    it('should show the founding member as having joined in 105 B.C.', () => {
      paramMap.next(convertToParamMap({ number: '2' }));
      showMember({ number: 2, showYearOfBirth: false });

      expect(statValues()).toEqual([member.peakRating, member.city, '105 B.C.']);
    });

    it.each([true, false])(
      'should show the admin icon only for an admin (%s)',
      isAdmin => {
        showMember({ isAdmin });

        expect(!!query(fixture.debugElement, '.admin-icon')).toBe(isAdmin);
      },
    );

    it('should link the city champion to the city champion page', () => {
      expect(query(fixture.debugElement, '.champion-link')).toBeFalsy();

      showMember(CITY_CHAMPION);

      expect(query(fixture.debugElement, '.champion-link').attributes['href']).toBe(
        '/city-champion',
      );
    });

    it('should badge the member as active or inactive', () => {
      const badge = (): BadgeComponent =>
        query(fixture.debugElement, '.status-badge').componentInstance;

      expect(badge().variant()).toBe('success');

      showMember({ isActive: false });

      expect(badge().variant()).toBe('warning');
      expect(query(fixture.debugElement, '.status-badge.inactive')).toBeTruthy();
    });

    it('should link to both online chess accounts', () => {
      const links = queryAll(fixture.debugElement, '.chess-accounts a').map(
        link => link.attributes['href'],
      );

      expect(links).toEqual([
        `https://www.chess.com/member/${member.chessComUsername}`,
        `https://lichess.org/@/${member.lichessUsername}`,
      ]);
    });

    it('should only list the online chess accounts the member has', () => {
      showMember({ chessComUsername: '' });

      expect(queryAll(fixture.debugElement, '.chess-accounts a')).toHaveLength(1);

      showMember({ chessComUsername: 'someone', lichessUsername: '' });

      expect(queryAll(fixture.debugElement, '.chess-accounts a')).toHaveLength(1);

      showMember({ chessComUsername: '', lichessUsername: '' });

      expect(query(fixture.debugElement, '.chess-accounts')).toBeFalsy();
    });

    it('should not render skeletons', () => {
      expect(queryAll(fixture.debugElement, '.profile-card ea-skeleton')).toHaveLength(0);
      expect(query(fixture.debugElement, '.profile').attributes['aria-busy']).toBe(
        'false',
      );
    });

    it('should keep showing the member when a later refresh fails', () => {
      store.setState({
        authState: authInitialState,
        membersState: { ...membersInitialState, failedLoads: ['member'] },
        tournamentsState: tournamentsInitialState,
      });
      store.refreshState();

      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      expect(queryTextContent(fixture.debugElement, '.member-name__first')).toBe(
        member.firstName,
      );
    });
  });

  it('should cover each card with a skeleton while the member loads', () => {
    store.overrideSelector(MembersSelectors.selectAllMembers, []);

    createComponent();

    const cards = queryAll(fixture.debugElement, '.profile-card');
    expect(cards).toHaveLength(2);
    cards.forEach(card => {
      expect(query(card, 'ea-card')).toBeTruthy();
      expect(query(card, 'ea-skeleton')).toBeTruthy();
    });
    expect(query(fixture.debugElement, '.profile--loading')).toBeTruthy();
    expect(query(fixture.debugElement, '.profile').attributes['aria-busy']).toBe('true');
    expect(query(fixture.debugElement, 'lcc-member-tournaments')).toBeFalsy();
  });

  describe('when the name no longer fits', () => {
    let resizeCallbacks: Array<() => void>;

    beforeEach(() => {
      resizeCallbacks = [];
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            resizeCallbacks.push(callback);
          }
          public observe = vi.fn();
          public disconnect = vi.fn();
        },
      );
      createComponent();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should offer the full name as a tooltip only while it is cut off', () => {
      const tooltip = (): TooltipDirective =>
        query(fixture.debugElement, '.member-name__text').injector.get(TooltipDirective);
      const lastName: HTMLElement = query(
        fixture.debugElement,
        '.member-name__last',
      ).nativeElement;

      expect(tooltip().tooltip()).toBeNull();

      Object.defineProperty(lastName, 'scrollWidth', { configurable: true, value: 120 });
      Object.defineProperty(lastName, 'clientWidth', { configurable: true, value: 80 });
      resizeCallbacks.forEach(callback => callback());
      fixture.detectChanges();

      expect(tooltip().tooltip()).toBe(`${member.firstName} ${member.lastName}`);
    });
  });

  describe('when the member fails to load', () => {
    beforeEach(() => {
      store.setState({
        authState: authInitialState,
        membersState: { ...membersInitialState, failedLoads: ['member'] },
        tournamentsState: tournamentsInitialState,
      });
      store.overrideSelector(MembersSelectors.selectAllMembers, []);
      createComponent();
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
        MembersActions.fetchMemberByNumberRequested({ memberNumber: member.number! }),
      );
    });
  });
});
