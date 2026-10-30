import { AvatarComponent, BadgeComponent, TooltipDirective } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { isEqual } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { MemberTournamentsComponent } from '@app/components/member-tournaments/member-tournaments.component';
import { RatingProgressionComponent } from '@app/components/rating-progression/rating-progression.component';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { ExternalRatings, Member } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { initialState as authInitialState } from '@app/store/auth/auth.reducer';
import { GamesActions, initialState as gamesInitialState } from '@app/store/games';
import {
  MembersActions,
  MembersSelectors,
  MembersState,
  initialState as membersInitialState,
} from '@app/store/members';
import {
  TournamentsActions,
  initialState as tournamentsInitialState,
} from '@app/store/tournaments';
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

  function setMembersState(membersState: Partial<MembersState>): void {
    store.setState({
      authState: authInitialState,
      gamesState: gamesInitialState,
      membersState: { ...membersInitialState, ...membersState },
      tournamentsState: tournamentsInitialState,
    });
    store.refreshState();
    fixture.detectChanges();
  }

  function showRatings(externalRatings: ExternalRatings): void {
    setMembersState({ externalRatings: { [Number(member.number)]: externalRatings } });
  }

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
            gamesState: gamesInitialState,
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

  afterEach(() => store.resetSelectors());

  describe("the member's openings", () => {
    it('should be fetched once for the openings card', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      createComponent();

      const fetch = GamesActions.fetchMemberOpeningsRequested({
        memberNumber: Number(member.number),
      });
      expect(
        dispatchSpy.mock.calls.filter(([action]) => isEqual(action, fetch)),
      ).toHaveLength(1);
    });

    it('should not be fetched again when already in the store', () => {
      store.setState({
        authState: authInitialState,
        gamesState: {
          ...gamesInitialState,
          memberOpenings: { [Number(member.number)]: { white: [], black: [] } },
        },
        membersState: membersInitialState,
        tournamentsState: tournamentsInitialState,
      });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      createComponent();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        GamesActions.fetchMemberOpeningsRequested({
          memberNumber: Number(member.number),
        }),
      );
    });
  });

  describe("the member's tournament results", () => {
    it('should be fetched once for the rating and tournaments cards', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      createComponent();

      const fetch = TournamentsActions.fetchMemberTournamentsRequested({
        memberNumber: Number(member.number),
      });
      expect(
        dispatchSpy.mock.calls.filter(([action]) => isEqual(action, fetch)),
      ).toHaveLength(1);
    });

    it('should not be fetched again when already in the store', () => {
      store.setState({
        authState: authInitialState,
        gamesState: gamesInitialState,
        membersState: membersInitialState,
        tournamentsState: {
          ...tournamentsInitialState,
          memberResults: { [Number(member.number)]: MOCK_MEMBER_TOURNAMENT_RESULTS },
        },
      });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      createComponent();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        TournamentsActions.fetchMemberTournamentsRequested({
          memberNumber: Number(member.number),
        }),
      );
    });
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

    it("should chart the member's rating progression", () => {
      const ratingProgression: RatingProgressionComponent = query(
        fixture.debugElement,
        'lcc-rating-progression',
      ).componentInstance;

      expect(ratingProgression.memberNumber()).toBe(member.number);
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

    it.each([true, false])(
      'should show the admin icon only for an admin (%s)',
      isAdmin => {
        showMember({ isAdmin });

        expect(!!query(fixture.debugElement, '.admin-icon')).toBe(isAdmin);
      },
    );

    it('should link the city champion to the City Championship page', () => {
      expect(query(fixture.debugElement, '.champion-link')).toBeFalsy();

      showMember(CITY_CHAMPION);

      expect(query(fixture.debugElement, '.champion-link').attributes['href']).toBe(
        '/city-championship',
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

    const textOf = (element: DebugElement): string =>
      element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

    const accountLinks = (): string[] =>
      queryAll(fixture.debugElement, '.chess-accounts a').map(
        link => link.attributes['href'] ?? '',
      );

    it("should link to each of the member's chess accounts, FIDE first", () => {
      expect(accountLinks()).toEqual([
        `https://ratings.fide.com/profile/${member.fideId}`,
        `https://www.chess.com/member/${member.chessComUsername}`,
        `https://lichess.org/@/${member.lichessUsername}`,
      ]);
    });

    it('should only list the chess accounts the member has', () => {
      showMember({ chessComUsername: '', fideId: '' });

      expect(accountLinks()).toEqual([`https://lichess.org/@/${member.lichessUsername}`]);

      showMember({
        chessComUsername: '',
        lichessUsername: '',
        fideId: '',
        cfcId: '150123',
      });

      expect(accountLinks()).toEqual(['https://www.chess.ca/en/ratings/p/?id=150123']);

      showMember({ chessComUsername: '', lichessUsername: '', fideId: '', cfcId: '' });

      expect(query(fixture.debugElement, '.chess-accounts')).toBeFalsy();
    });

    it("should show every account's time controls under their labels, a dash where unrated", () => {
      showRatings({
        chessCom: [
          { timeControl: 'rapid', rating: 1520, provisional: false },
          { timeControl: 'blitz', rating: 1430, provisional: false },
        ],
        lichess: [{ timeControl: 'bullet', rating: 1610, provisional: true }],
        fide: [{ timeControl: 'standard', rating: 1781, provisional: false }],
        cfc: null,
        fideRanks: null,
      });

      const stats = queryAll(fixture.debugElement, '.account').map(account =>
        queryAll(account, '.account__stat').map(textOf),
      );
      expect(stats).toEqual([
        ['Standard 1781', 'Rapid – Unrated', 'Blitz – Unrated'],
        ['Rapid 1520', 'Blitz 1430', 'Bullet – Unrated'],
        ['Rapid – Unrated', 'Blitz – Unrated', 'Bullet 1610?'],
      ]);
    });

    it("should set FIDE apart on a card of its own, with the member's world and national ranks", () => {
      showRatings({
        chessCom: null,
        lichess: null,
        fide: [],
        cfc: null,
        fideRanks: {
          federation: 'CAN',
          world: { rank: 48213, amongActive: false },
          national: { rank: 402, amongActive: true },
        },
      });

      const featured = queryAll(fixture.debugElement, '.account--featured');
      expect(featured).toHaveLength(1);
      expect(queryTextContent(featured[0], '.platform')).toBe('FIDE');
      expect(queryAll(featured[0], '.account__ranks .account__stat').map(textOf)).toEqual(
        ['World rank #48,213', 'Canada rank #402'],
      );
    });

    it('should show no ratings for an account whose ratings were not found', () => {
      showRatings({
        chessCom: null,
        lichess: null,
        fide: null,
        cfc: null,
        fideRanks: null,
      });

      expect(queryAll(fixture.debugElement, '.chess-accounts a')).toHaveLength(3);
      expect(query(fixture.debugElement, '.account__stat')).toBeFalsy();
    });

    it("should hold each account's ratings under their labels with skeletons until they arrive", () => {
      const stats = queryAll(fixture.debugElement, '.account__stat');
      expect(stats.map(textOf)).toEqual([
        'Standard',
        'Rapid',
        'Blitz',
        'Rapid',
        'Blitz',
        'Bullet',
        'Rapid',
        'Blitz',
        'Bullet',
      ]);
      expect(
        stats.every(stat => !!query(stat, '.account__stat-value lcc-text-skeleton')),
      ).toBe(true);
    });

    it('should drop the rating skeletons when the profile fails to arrive', () => {
      setMembersState({ failedLoads: ['member'] });

      expect(query(fixture.debugElement, '.account__stat')).toBeFalsy();
      expect(query(fixture.debugElement, 'lcc-text-skeleton')).toBeFalsy();
    });

    it('should not render skeletons', () => {
      expect(queryAll(fixture.debugElement, '.profile-card > ea-skeleton')).toHaveLength(
        0,
      );
      expect(query(fixture.debugElement, '.profile').attributes['aria-busy']).toBe(
        'false',
      );
    });

    it('should keep showing the member when a later refresh fails', () => {
      store.setState({
        authState: authInitialState,
        gamesState: gamesInitialState,
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

  it('should cover the profile card with a skeleton while the member loads, the rest waiting for it', () => {
    store.overrideSelector(MembersSelectors.selectAllMembers, []);

    createComponent();

    const cards = queryAll(fixture.debugElement, '.profile-card');
    expect(cards).toHaveLength(1);
    expect(query(cards[0], 'ea-card')).toBeTruthy();
    expect(query(cards[0], 'ea-skeleton')).toBeTruthy();
    expect(query(fixture.debugElement, 'ea-accordion')).toBeFalsy();
    expect(query(fixture.debugElement, '.profile--loading')).toBeTruthy();
    expect(query(fixture.debugElement, '.profile').attributes['aria-busy']).toBe('true');
    expect(query(fixture.debugElement, 'lcc-member-tournaments')).toBeFalsy();
  });

  describe('once the member loads', () => {
    beforeEach(() => {
      createComponent();
    });

    it('should offer the full name as a tooltip while it is cut off', () => {
      const tooltip = query(fixture.debugElement, '.member-name__text').injector.get(
        TooltipDirective,
      );

      expect(tooltip.eaTooltip()).toBe(`${member.firstName} ${member.lastName}`);
      expect(tooltip.whenClipped()).toBe(true);
    });
  });

  describe('when the member fails to load', () => {
    beforeEach(() => {
      store.setState({
        authState: authInitialState,
        gamesState: gamesInitialState,
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
