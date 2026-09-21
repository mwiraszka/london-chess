import { CanActivateFn } from '@angular/router';

import { Article } from '@app/models';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { isCollectionId } from '@app/utils';

import { recordGuard } from './record.guard';

// Refetched so an edit made elsewhere reaches every reader
export function articleGuard(param: string): CanActivateFn {
  return recordGuard<Article>({
    param,
    isWellFormed: isCollectionId,
    select: ArticlesSelectors.selectArticleById,
    request: articleId => ArticlesActions.fetchArticleRequested({ articleId }),
    failed: ArticlesActions.fetchArticleFailed,
    refreshes: true,
  });
}
