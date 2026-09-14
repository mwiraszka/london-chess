import { ModificationInfo } from '../models/modification-info.model';
import { Editor, creditEditor } from './modification-info.util';

const submitted: ModificationInfo = {
  createdBy: 'Original Author',
  createdByNumber: 4,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateLastEdited: '2024-02-01T00:00:00.000Z',
  lastEditedBy: 'Someone Else',
  lastEditedByNumber: 9,
};

const editor: Editor = { name: 'Signed In', number: 1 };

describe('creditEditor', () => {
  it('should credit the signed-in admin as creator and editor of a new record', () => {
    const info = creditEditor(submitted, editor, true);

    expect(info).toEqual({
      ...submitted,
      createdBy: 'Signed In',
      createdByNumber: 1,
      lastEditedBy: 'Signed In',
      lastEditedByNumber: 1,
    });
  });

  it('should keep the original creator and credit the signed-in admin as editor', () => {
    const info = creditEditor(submitted, editor, false);

    expect(info).toEqual({
      ...submitted,
      lastEditedBy: 'Signed In',
      lastEditedByNumber: 1,
    });
  });
});
