import { IsoDate } from './core.model';

export interface SiteUpdateTag {
  label: string;
  color: string;
}

export interface SiteUpdatesRelease {
  version: string;
  /** Release date, or null while the version is still in development. */
  date: IsoDate | null;
  added: string[];
  changed: string[];
  fixed: string[];
  tags: SiteUpdateTag[];
}
