import { ModificationInfo } from '../models/modification-info.model';

export interface Editor {
  name: string;
  number: number | null;
}

// Attribution and timestamps always come from the server: the signed-in admin's member
// record, the time of the save and, for an existing record, what was stored when it was made
export function creditEditor(
  editor: Editor,
  original: ModificationInfo | null,
): ModificationInfo {
  const now = new Date().toISOString();
  return {
    createdBy: original ? original.createdBy : editor.name,
    createdByNumber: original ? original.createdByNumber : editor.number,
    dateCreated: original ? original.dateCreated : now,
    dateLastEdited: now,
    lastEditedBy: editor.name,
    lastEditedByNumber: editor.number,
  };
}
