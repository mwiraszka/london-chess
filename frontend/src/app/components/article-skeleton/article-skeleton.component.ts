import { SkeletonComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lcc-article-skeleton',
  templateUrl: './article-skeleton.component.html',
  styleUrls: ['../article/article.component.scss', './article-skeleton.component.scss'],
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleSkeletonComponent {
  // Ragged widths read as prose; the line count is a guess at an average article
  protected readonly bodyLineWidths = [
    '100%',
    '96%',
    '100%',
    '88%',
    '100%',
    '94%',
    '100%',
    '72%',
  ];
}
