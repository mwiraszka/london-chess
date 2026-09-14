import { IsoDate } from './core.model';

export interface ModificationInfo {
  dateCreated: IsoDate;
  createdBy: string;
  // The editor's member number, so their current name shows wherever they are credited
  createdByNumber: number | null;
  dateLastEdited: IsoDate;
  lastEditedBy: string;
  lastEditedByNumber: number | null;
}
