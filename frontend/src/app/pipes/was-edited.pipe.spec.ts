import moment from 'moment-timezone';

import { ModificationInfo } from '@app/models';

import { WasEditedPipe } from './was-edited.pipe';

describe('WasEditedPipe', () => {
  const pipe = new WasEditedPipe();

  it('handles `null` modification info correctly', () => {
    expect(pipe.transform(null)).toBe(null);
  });

  it('handles invalid `dateCreated` property correctly', () => {
    const modificationInfo: ModificationInfo = {
      createdBy: 'name',
      createdByNumber: null,
      dateCreated: 'invalid date',
      lastEditedBy: 'name',
      lastEditedByNumber: null,
      dateLastEdited: moment().toISOString(),
    };
    expect(pipe.transform(modificationInfo)).toBe(null);
  });

  it('handles invalid `dateLastEdited` property correctly', () => {
    const modificationInfo: ModificationInfo = {
      createdBy: 'name',
      createdByNumber: null,
      dateCreated: moment().toISOString(),
      lastEditedBy: 'name',
      lastEditedByNumber: null,
      dateLastEdited: 'invalid date',
    };
    expect(pipe.transform(modificationInfo)).toBe(null);
  });

  describe('granularity set to `millisecond`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00.000').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:00:00.001').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'millisecond')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00.000').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:00:00.000').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'millisecond')).toBe(false);
    });
  });

  describe('granularity set to `second`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00.000').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:00:01.000').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'second')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00.000').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:00:00.999').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'second')).toBe(false);
    });
  });

  describe('granularity set to `minute`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:01:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'minute')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:00:59').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'minute')).toBe(false);
    });
  });

  describe('granularity set to `hour`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T01:00:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'hour')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T00:59:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'hour')).toBe(false);
    });
  });

  describe('granularity set to `day`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T23:59:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-02T00:00:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo)).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-01T23:59:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo)).toBe(false);
    });
  });

  describe('granularity set to `week`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-05T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-12T00:00:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'week')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-05T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-11T23:59:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'week')).toBe(false);
    });
  });

  describe('granularity set to `month`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-02-01T00:00:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'month')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-01-31T23:59:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'month')).toBe(false);
    });
  });

  describe('granularity set to `year`', () => {
    it('identifies different `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2026-01-01T00:00:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'year')).toBe(true);
    });

    it('identifies same `dateCreated` and `dateLastEdited` dates correctly', () => {
      const modificationInfo: ModificationInfo = {
        createdBy: 'name',
        createdByNumber: null,
        dateCreated: moment('2025-01-01T00:00:00').toISOString(),
        lastEditedBy: 'name',
        lastEditedByNumber: null,
        dateLastEdited: moment('2025-12-31T23:59:00').toISOString(),
      };
      expect(pipe.transform(modificationInfo, 'year')).toBe(false);
    });
  });
});
