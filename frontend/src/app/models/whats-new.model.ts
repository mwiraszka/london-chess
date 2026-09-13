import { IsoDate } from './core.model';

export interface WhatsNewRelease {
  version: string;
  /** Release date, or null while the version is still in development. */
  date: IsoDate | null;
  added: string[];
  changed: string[];
  fixed: string[];
}
