import { FormControl } from '@angular/forms';

import { ARTICLE_FORM_DATA_PROPERTIES } from '@app/constants';

import { Id, IsoDate } from './core.model';
import { ModificationInfo } from './modification-info.model';

export interface Article {
  id: Id;
  title: string;
  body: string;
  bannerImageId: Id;
  bookmarkDate: IsoDate | null;
  modificationInfo: ModificationInfo;
}

export type ArticleFormData = Pick<
  Article,
  (typeof ARTICLE_FORM_DATA_PROPERTIES)[number]
>;

export type ArticleFormGroup = {
  [Property in keyof ArticleFormData]: FormControl<ArticleFormData[Property]>;
};
