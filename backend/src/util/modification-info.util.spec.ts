import { ModificationInfo } from '../models/modification-info.model';
import { Editor, creditEditor } from './modification-info.util';

const original: ModificationInfo = {
  createdBy: 'Original Author',
  createdByNumber: 4,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateLastEdited: '2024-02-01T00:00:00.000Z',
  lastEditedBy: 'Someone Else',
  lastEditedByNumber: 9,
};

const editor: Editor = { name: 'Signed In', number: 1 };

describe('creditEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
  });

  it('should credit the signed-in admin with a new record, made now', () => {
    const info = creditEditor(editor, null);

    expect(info).toEqual({
      createdBy: 'Signed In',
      createdByNumber: 1,
      dateCreated: '2026-10-05T12:00:00.000Z',
      dateLastEdited: '2026-10-05T12:00:00.000Z',
      lastEditedBy: 'Signed In',
      lastEditedByNumber: 1,
    });
  });

  it('should keep who made a record and when, crediting the signed-in admin with the edit', () => {
    const info = creditEditor(editor, original);

    expect(info).toEqual({
      ...original,
      dateLastEdited: '2026-10-05T12:00:00.000Z',
      lastEditedBy: 'Signed In',
      lastEditedByNumber: 1,
    });
  });
});
