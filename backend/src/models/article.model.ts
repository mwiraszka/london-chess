import { Schema, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
import { ModificationInfo } from './modification-info.model';
import { SortingConfig } from './pagination.model';

export interface Article {
  id: Id;
  title: string;
  body: string;
  bannerImageId: Id;
  bookmarkDate: IsoDate | null;
  modificationInfo: ModificationInfo;
}

const articleSchema = new Schema<Article>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    bannerImageId: { type: String, required: true },
    bookmarkDate: { type: String, default: null },
    modificationInfo: { type: Object, required: true },
  },
  { versionKey: false },
);

export const ArticleModel = model<Article>('Article', articleSchema);

export const articleTypes: Record<keyof Article, string | string[]> = {
  id: 'string',
  title: 'string',
  body: 'string',
  bannerImageId: 'string',
  bookmarkDate: ['string', 'null'],
  modificationInfo: 'object',
};

export const articleSortingConfig: SortingConfig = {
  fieldMappings: {},
  secondarySort: {
    bookmarkDate: 'modificationInfo.dateCreated',
  },
  searchableFields: [
    'title',
    'body',
    'modificationInfo.createdBy',
    'modificationInfo.lastEditedBy',
  ],
};
