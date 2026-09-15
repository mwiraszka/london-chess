import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { ImageComponent } from '@app/components/image/image.component';
import { MarkdownRendererComponent } from '@app/components/markdown-renderer/markdown-renderer.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { Article, Image } from '@app/models';
import { FormatDatePipe, TruncateByCharsPipe, WasEditedPipe } from '@app/pipes';

@Component({
  selector: 'lcc-article',
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss',
  imports: [
    FormatDatePipe,
    ImageComponent,
    MarkdownRendererComponent,
    MemberLinkComponent,
    TruncateByCharsPipe,
    WasEditedPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent {
  @Input({ required: true }) article!: Article;
  @Input({ required: true }) bannerImage!: Image | null;
  @Input({ required: true }) isWideView!: boolean;
  @Input() bodyImages: Image[] = [];
}
