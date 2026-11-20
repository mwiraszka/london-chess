import { PopoverComponent, TooltipDirective } from '@eagami/ui';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';

import { Component, DebugElement, TemplateRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberProfile, ReactionGroup, User } from '@app/models';
import { ApiError, ApiService } from '@app/services/api.service';
import { refreshAppRequested } from '@app/store/app/app.actions';
import { query, queryAll } from '@app/utils';

import { ArticleReactionsComponent } from './article-reactions.component';

@Component({
  template: `<lcc-article-reactions [articleId]="articleId()" />`,
  imports: [ArticleReactionsComponent],
})
class HostComponent {
  public readonly articleId = signal('article-1');
}

interface ApiMock {
  get: Mock<Promise<unknown>, [string]>;
  put: Mock<Promise<ReactionGroup[]>, [string, unknown]>;
  delete: Mock<Promise<ReactionGroup[]>, [string]>;
}

const MEMBER: User = {
  id: 'user-1',
  firstName: 'Magnus',
  lastName: 'Carlsen',
  email: 'magnus@example.com',
  isAdmin: false,
  memberNumber: 1,
};

const PROFILES: MemberProfile[] = [
  {
    number: 1,
    firstName: 'Magnus',
    lastName: 'Carlsen',
    rating: '2800',
    peakRating: '2882',
    avatarUrl: 'https://avatars.test/1',
  },
  {
    number: 2,
    firstName: 'Judit',
    lastName: 'Polgar',
    rating: '2700',
    peakRating: '2735',
    avatarUrl: null,
  },
];

const GROUPS: ReactionGroup[] = [
  { emoji: '👍', memberNumbers: [2, 1] },
  { emoji: '🎉', memberNumbers: [2] },
];

describe('ArticleReactionsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let store: MockStore;
  let api: ApiMock;
  let actions$: Subject<Action>;
  let groups: ReactionGroup[];

  const reactionElements = () => queryAll(fixture.debugElement, '.reaction');
  const reactionTexts = () =>
    reactionElements().map(element => {
      const reaction: HTMLElement = element.nativeElement;
      return [...reaction.children].map(part => part.textContent?.trim() ?? '');
    });
  const addButton = () => query(fixture.debugElement, 'ea-button');
  const popover = (): PopoverComponent =>
    query(fixture.debugElement, 'ea-popover').componentInstance;

  // Each row of the list shown on hover: the emoji, then the member's name
  const tooltipRows = (element: DebugElement): string[][] => {
    const content = element.injector.get(TooltipDirective).eaTooltip();
    if (!(content instanceof TemplateRef)) {
      return [];
    }
    const view = content.createEmbeddedView(null);
    view.detectChanges();
    const [list]: HTMLElement[] = view.rootNodes;
    return [...list.children].map(row =>
      [...row.children]
        .filter(part => part.tagName !== 'EA-AVATAR')
        .map(part => part.textContent?.trim() ?? ''),
    );
  };

  // Waits for every request made so far to answer, and for the component to take it in
  async function settle(): Promise<void> {
    await Promise.allSettled(
      [api.get, api.put, api.delete].flatMap(mock =>
        mock.mock.results.map(result => result.value),
      ),
    );
    fixture.detectChanges();
  }

  async function render(user: User | null): Promise<void> {
    store.setState({ authState: { user } });
    fixture.detectChanges();
    await settle();
  }

  beforeEach(async () => {
    groups = GROUPS;
    api = {
      get: vi.fn<(path: string) => Promise<unknown>>(async path =>
        path === '/public/members/profiles' ? PROFILES : groups,
      ),
      put: vi.fn<(path: string, body: unknown) => Promise<ReactionGroup[]>>(),
      delete: vi.fn<(path: string) => Promise<ReactionGroup[]>>(),
    };
    actions$ = new Subject<Action>();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { authState: { user: null } } }),
        { provide: ApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    store = TestBed.inject(MockStore);
  });

  describe('for a visitor', () => {
    beforeEach(async () => {
      await render(null);
    });

    it("should load the article's reactions", () => {
      expect(api.get).toHaveBeenCalledWith('/articles/article-1/reactions');
    });

    it('should show each emoji in the order given, numbered only when given more than once', () => {
      expect(reactionTexts()).toEqual([['👍', '2'], ['🎉']]);
    });

    it('should name each emoji and how many members gave it', () => {
      expect(reactionElements().map(element => element.attributes['aria-label'])).toEqual(
        ['Thumbs up, from 2 members', 'Party popper, from 1 member'],
      );
    });

    it('should list on hover who gave each emoji, in the order they did', () => {
      const [thumbsUp, partyPopper] = reactionElements();

      expect(tooltipRows(thumbsUp)).toEqual([
        ['👍', 'Judit Polgar'],
        ['👍', 'Magnus Carlsen'],
      ]);
      expect(tooltipRows(partyPopper)).toEqual([['🎉', 'Judit Polgar']]);
    });

    it('should show the reactions without letting the visitor react', () => {
      expect(reactionElements().every(element => element.name === 'span')).toBe(true);
      expect(addButton()).toBeFalsy();
    });

    it('should hide itself once a refresh finds nobody has reacted', async () => {
      groups = [];

      actions$.next(refreshAppRequested());
      await settle();

      const host: HTMLElement = query(
        fixture.debugElement,
        'lcc-article-reactions',
      ).nativeElement;
      expect(host.hidden).toBe(true);
    });
  });

  describe('for a member', () => {
    beforeEach(async () => {
      await render(MEMBER);
    });

    it('should mark the emojis the member gave', () => {
      expect(
        reactionElements().map(element => element.attributes['aria-pressed']),
      ).toEqual(['true', 'false']);
    });

    it('should take back an emoji the member gave', async () => {
      api.delete.mockResolvedValue([{ emoji: '👍', memberNumbers: [2] }, GROUPS[1]]);

      reactionElements()[0].nativeElement.click();
      await settle();

      expect(api.delete).toHaveBeenCalledWith(
        `/articles/article-1/reactions/${encodeURIComponent('👍')}`,
      );
      expect(reactionTexts()).toEqual([['👍'], ['🎉']]);
    });

    it('should add an emoji someone else gave', async () => {
      api.put.mockResolvedValue([
        { emoji: '🎉', memberNumbers: [2, 1] },
        { emoji: '👍', memberNumbers: [2, 1] },
      ]);

      reactionElements()[1].nativeElement.click();
      await settle();

      expect(api.put).toHaveBeenCalledWith(
        `/articles/article-1/reactions/${encodeURIComponent('🎉')}`,
        null,
      );
      expect(reactionTexts()).toEqual([
        ['🎉', '2'],
        ['👍', '2'],
      ]);
    });

    it('should open a picker of every emoji on offer', () => {
      addButton().triggerEventHandler('clicked');
      fixture.detectChanges();

      expect(popover().open()).toBe(true);
      expect(queryAll(fixture.debugElement, '.picker-emoji')).toHaveLength(100);
    });

    it('should add the emoji picked and close the picker', async () => {
      api.put.mockResolvedValue([...GROUPS, { emoji: '♟️', memberNumbers: [1] }]);
      addButton().triggerEventHandler('clicked');
      fixture.detectChanges();
      const pawn = queryAll(fixture.debugElement, '.picker-emoji').find(
        element => element.attributes['aria-label'] === 'Chess pawn',
      );

      pawn?.nativeElement.click();
      await settle();

      expect(api.put).toHaveBeenCalledWith(
        `/articles/article-1/reactions/${encodeURIComponent('♟️')}`,
        null,
      );
      expect(popover().open()).toBe(false);
      expect(reactionTexts()).toEqual([['👍', '2'], ['🎉'], ['♟️']]);
    });
  });

  describe('when the reactions fail to load', () => {
    beforeEach(async () => {
      api.get.mockImplementation(async (path: string) => {
        if (path === '/public/members/profiles') {
          return PROFILES;
        }
        throw new ApiError('Unable to reach the server', 0);
      });
      await render(null);
    });

    it('should offer to try again', async () => {
      api.get.mockImplementation(async (path: string) =>
        path === '/public/members/profiles' ? PROFILES : GROUPS,
      );

      query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');
      await settle();

      expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      expect(reactionTexts()).toEqual([['👍', '2'], ['🎉']]);
    });
  });

  it('should load the reactions of the article it is given', async () => {
    await render(null);

    fixture.componentInstance.articleId.set('article-2');
    fixture.detectChanges();
    await settle();

    expect(api.get).toHaveBeenCalledWith('/articles/article-2/reactions');
  });
});
