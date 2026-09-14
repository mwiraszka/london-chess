import { FormArray, FormControl, FormGroup } from '@angular/forms';

import { IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';

import { Id, IsoDate, Url } from './core.model';
import { ModificationInfo } from './modification-info.model';

// The image properties that are determined in the frontend
export interface BaseImage {
  id: Id;
  filename: string;
  caption: string;
  album: string;
  albumCover: boolean;
  albumOrdinality: string;
  modificationInfo: ModificationInfo;
}

// The image properties that are only determined once processed in the backend
export interface Image extends BaseImage {
  mainWidth?: number;
  mainHeight?: number;
  mainFileSize?: number;
  mainUrl?: Url;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailFileSize?: number;
  thumbnailUrl?: Url;
  urlExpirationDate?: IsoDate;
  articleAppearances?: number;
}

export type ImageDisplayMode = 'none' | 'thumbnail' | 'main' | 'fallback';

export type IndexedDbImageData = Pick<BaseImage, 'id' | 'filename'> & { dataUrl: Url };

export type ImageFormData = Pick<BaseImage, (typeof IMAGE_FORM_DATA_PROPERTIES)[number]>;

export type ImageFormGroup = {
  [Property in keyof ImageFormData]: FormControl<ImageFormData[Property]>;
};

export interface AlbumFormData {
  album: string;
  existingImages: Omit<ImageFormGroup, 'album'>[];
  newImages: Omit<ImageFormGroup, 'album'>[];
}

export interface AlbumFormGroup {
  album: FormControl<string>;
  existingImages: FormArray<FormGroup<Omit<ImageFormGroup, 'album'>>>;
  newImages: FormArray<FormGroup<Omit<ImageFormGroup, 'album'>>>;
}
