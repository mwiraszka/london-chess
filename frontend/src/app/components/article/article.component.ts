import { AvatarComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';

import { ImageComponent } from '@app/components/image/image.component';
import { MarkdownRendererComponent } from '@app/components/markdown-renderer/markdown-renderer.component';
import { Article, Image } from '@app/models';
import { FormatDatePipe, TruncateByCharsPipe, WasEditedPipe } from '@app/pipes';
import { MemberProfilesService } from '@app/services';
import { getInitials } from '@app/utils';

@Component({
  selector: 'lcc-article',
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss',
  imports: [
    AvatarComponent,
    FormatDatePipe,
    ImageComponent,
    MarkdownRendererComponent,
    TruncateByCharsPipe,
    WasEditedPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnInit {
  @Input({ required: true }) article!: Article;
  @Input({ required: true }) bannerImage!: Image | null;
  @Input({ required: true }) isWideView!: boolean;
  @Input() bodyImages: Image[] = [];

  protected readonly memberProfiles = inject(MemberProfilesService);

  public ngOnInit(): void {
    void this.memberProfiles.load();
  }

  protected initialsFor(name: string): string | undefined {
    return getInitials(name);
  }
}
