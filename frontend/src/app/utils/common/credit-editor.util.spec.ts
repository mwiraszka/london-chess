import { MOCK_MODIFICATION_INFOS } from '@app/mocks/modification-info.mock';

import { creditEditor } from './credit-editor.util';

describe('creditEditor', () => {
  const editor = { firstName: 'Jane', lastName: 'Smith', memberNumber: 7 };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T14:30:00.000Z'));
  });

  it('should credit a new record wholly to its editor', () => {
    const credited = creditEditor(editor);

    expect(credited).toEqual({
      createdBy: 'Jane Smith',
      createdByNumber: 7,
      dateCreated: '2026-10-05T14:30:00.000Z',
      lastEditedBy: 'Jane Smith',
      lastEditedByNumber: 7,
      dateLastEdited: '2026-10-05T14:30:00.000Z',
    });
  });

  it('should keep who created an existing record and when', () => {
    const original = MOCK_MODIFICATION_INFOS[0];

    const credited = creditEditor(editor, original);

    expect(credited).toEqual({
      createdBy: original.createdBy,
      createdByNumber: original.createdByNumber,
      dateCreated: original.dateCreated,
      lastEditedBy: 'Jane Smith',
      lastEditedByNumber: 7,
      dateLastEdited: '2026-10-05T14:30:00.000Z',
    });
  });
});
