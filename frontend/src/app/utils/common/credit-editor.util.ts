import { ModificationInfo, User } from '@app/models';
import moment from '@app/utils/datetime/moment';

// Credits a save to its editor, keeping who created the record and when
export function creditEditor(
  editor: Pick<User, 'firstName' | 'lastName' | 'memberNumber'>,
  original: ModificationInfo | null = null,
): ModificationInfo {
  const name = `${editor.firstName} ${editor.lastName}`;
  const now = moment().toISOString();
  return {
    createdBy: original?.createdBy ?? name,
    createdByNumber: original ? original.createdByNumber : editor.memberNumber,
    dateCreated: original?.dateCreated ?? now,
    lastEditedBy: name,
    lastEditedByNumber: editor.memberNumber,
    dateLastEdited: now,
  };
}
