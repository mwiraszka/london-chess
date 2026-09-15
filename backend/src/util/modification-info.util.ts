import { ModificationInfo } from '../models/modification-info.model';

export interface Editor {
  name: string;
  number: number | null;
}

// Attribution always comes from the signed-in admin's member record, never from
// the request body
export function creditEditor(
  info: ModificationInfo,
  editor: Editor,
  isNew: boolean,
): ModificationInfo {
  return {
    createdBy: isNew ? editor.name : info.createdBy,
    createdByNumber: isNew ? editor.number : info.createdByNumber,
    dateCreated: info.dateCreated,
    dateLastEdited: info.dateLastEdited,
    lastEditedBy: editor.name,
    lastEditedByNumber: editor.number,
  };
}
