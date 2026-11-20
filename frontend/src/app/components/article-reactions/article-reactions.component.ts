import {
  AvatarComponent,
  ButtonComponent,
  PopoverComponent,
  SmileIconComponent,
  TooltipDirective,
} from '@eagami/ui';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { REACTION_EMOJIS } from '@app/constants/reactions';
import { Id, LoadStatus, ReactionGroup } from '@app/models';
import { ApiService } from '@app/services/api.service';
import { MemberProfilesService } from '@app/services/member-profiles.service';
import { refreshAppRequested } from '@app/store/app/app.actions';
import { AuthSelectors } from '@app/store/auth';
import { getInitials } from '@app/utils';

/**
 * The emojis members have given an article, most given first, each listing on hover who
 * gave it. Anyone can see them; members with an account can add and take back their own.
 */
@Component({
  selector: 'lcc-article-reactions',
  templateUrl: './article-reactions.component.html',
  styleUrl: './article-reactions.component.scss',
  imports: [
    AvatarComponent,
    ButtonComponent,
    LoadFailedComponent,
    NgTemplateOutlet,
    PopoverComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[hidden]': "!canReact() && !groups().length && status() !== 'failed'",
  },
})
export class ArticleReactionsComponent {
  public readonly articleId = input.required<Id>();

  private readonly actions = inject(Actions);
  private readonly api = inject(ApiService);
  private readonly memberProfiles = inject(MemberProfilesService);
  private readonly store = inject(Store);

  protected readonly emojis = REACTION_EMOJIS;
  protected readonly pickerId = 'reaction-picker';
  protected readonly smileIcon = SmileIconComponent;

  protected readonly groups = signal<ReactionGroup[]>([]);
  protected readonly status = signal<LoadStatus>('loading');
  protected readonly isPickerOpen = signal(false);
  private readonly isSaving = signal(false);

  protected readonly pickerAnchor = viewChild('pickerTrigger', { read: ElementRef });
  private readonly pickerTrigger = viewChild('pickerTrigger', { read: ButtonComponent });

  private readonly emojiNames = new Map<string, string>(
    REACTION_EMOJIS.map(({ emoji, name }) => [emoji, name]),
  );
  private readonly user = this.store.selectSignal(AuthSelectors.selectUser);
  private readonly memberNumber = computed(() => this.user()?.memberNumber ?? null);

  protected readonly canReact = computed(() => this.memberNumber() !== null);

  protected readonly ownEmojis = computed(() => {
    const number = this.memberNumber();
    return new Set(
      number === null
        ? []
        : this.groups()
            .filter(group => group.memberNumbers.includes(number))
            .map(group => group.emoji),
    );
  });

  protected readonly reactions = computed(() =>
    this.groups().map(({ emoji, memberNumbers }) => {
      const name = this.emojiNames.get(emoji) ?? emoji;
      const count = memberNumbers.length;
      return {
        emoji,
        count,
        isOwn: this.ownEmojis().has(emoji),
        label: `${name}, from ${count} ${count === 1 ? 'member' : 'members'}`,
        reactors: memberNumbers.flatMap(number => {
          const profile = this.memberProfiles.profileFor(number);
          if (!profile) {
            return [];
          }
          const fullName = `${profile.firstName} ${profile.lastName}`;
          return [
            {
              number,
              name: fullName,
              initials: getInitials(fullName),
              avatarUrl: profile.avatarUrl ?? undefined,
            },
          ];
        }),
      };
    }),
  );

  constructor() {
    void this.memberProfiles.load();

    effect(() => {
      const articleId = this.articleId();
      untracked(() => {
        this.groups.set([]);
        void this.load(articleId);
      });
    });

    this.actions
      .pipe(ofType(refreshAppRequested), takeUntilDestroyed())
      .subscribe(() => void this.load(this.articleId()));
  }

  protected async load(articleId: Id): Promise<void> {
    this.status.set('loading');

    try {
      const groups = await this.api.get<ReactionGroup[]>(
        `/articles/${articleId}/reactions`,
      );
      if (articleId === this.articleId()) {
        this.groups.set(groups);
        this.status.set('loaded');
      }
    } catch {
      if (articleId === this.articleId()) {
        this.status.set('failed');
      }
    }
  }

  protected async onToggle(emoji: string): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    const articleId = this.articleId();
    const path = `/articles/${articleId}/reactions/${encodeURIComponent(emoji)}`;
    this.isSaving.set(true);

    try {
      const groups = this.ownEmojis().has(emoji)
        ? await this.api.delete<ReactionGroup[]>(path)
        : await this.api.put<ReactionGroup[]>(path, null);
      if (articleId === this.articleId()) {
        this.groups.set(groups);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  protected onPick(emoji: string): void {
    this.isPickerOpen.set(false);
    this.pickerTrigger()?.focus();
    void this.onToggle(emoji);
  }
}
