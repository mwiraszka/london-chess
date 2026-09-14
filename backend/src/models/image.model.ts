import { Schema, model } from 'mongoose';

import { Id, IsoDate, Url } from './core.model';
import { ModificationInfo } from './modification-info.model';
import { SortingConfig } from './pagination.model';

// The properties of CombinedImage that are stored in MongoDB
export interface Image {
  id: Id;
  filename: string;
  mainFileSize?: number;
  mainWidth?: number;
  mainHeight?: number;
  thumbnailFileSize?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  caption: string;
  album: string;
  albumCover: boolean;
  albumOrdinality: string;
  modificationInfo: ModificationInfo;
}

export interface CombinedImage extends Image {
  mainUrl?: Url;
  thumbnailUrl?: Url;
  urlExpirationDate: IsoDate;
  articleAppearances?: number;
}

const imageSchema = new Schema<Image>(
  {
    filename: { type: String, required: true },
    mainFileSize: { type: Number, default: 0 },
    mainWidth: { type: Number, default: 0 },
    mainHeight: { type: Number, default: 0 },
    thumbnailFileSize: { type: Number, default: 0 },
    thumbnailWidth: { type: Number, default: 0 },
    thumbnailHeight: { type: Number, default: 0 },
    caption: { type: String, required: true },
    album: { type: String, required: true },
    albumCover: { type: Boolean, required: true },
    albumOrdinality: { type: String, required: true },
    modificationInfo: {
      dateCreated: { type: String, required: true },
      createdBy: { type: String, required: true },
      createdByNumber: { type: Number, default: null },
      dateLastEdited: { type: String, required: true },
      lastEditedBy: { type: String, required: true },
      lastEditedByNumber: { type: Number, default: null },
    },
  },
  { versionKey: false },
);

export const ImageModel = model<Image>('Image', imageSchema);

// This only includes the properties of the image that are passed in when updating
export const imageTypes: Record<
  keyof Omit<
    Image,
    | 'mainFileSize'
    | 'mainWidth'
    | 'mainHeight'
    | 'thumbnailFileSize'
    | 'thumbnailWidth'
    | 'thumbnailHeight'
  >,
  string | string[]
> = {
  id: 'string',
  filename: 'string',
  caption: 'string',
  album: 'string',
  albumCover: 'boolean',
  albumOrdinality: 'string',
  modificationInfo: 'object',
};

export const imagesSortingConfig: SortingConfig = {
  fieldMappings: {
    uploadDate: 'modificationInfo.dateCreated',
  },
  secondarySort: {
    uploadDate: 'filename',
    album: 'albumOrdinality',
  },
  searchableFields: ['caption', 'filename', 'album'],
};
