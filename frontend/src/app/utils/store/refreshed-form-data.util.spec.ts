import { refreshedFormData } from './refreshed-form-data.util';

describe('refreshedFormData', () => {
  const saved = { title: 'Blitz night', details: '' };
  const refreshed = { title: 'Blitz night', details: 'Bring a clock' };

  it('should keep a draft with unsaved edits', () => {
    const draft = { title: 'Rapid night', details: '' };

    expect(refreshedFormData(draft, saved, refreshed)).toBe(draft);
  });

  it('should take on the refreshed copy when the draft has no edits', () => {
    expect(refreshedFormData({ ...saved }, saved, refreshed)).toBe(refreshed);
  });

  it('should take on the refreshed copy of a record not seen before', () => {
    expect(refreshedFormData(undefined, undefined, refreshed)).toBe(refreshed);
  });
});
