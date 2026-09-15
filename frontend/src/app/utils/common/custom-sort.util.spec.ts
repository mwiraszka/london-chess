import { customSort } from './custom-sort.util';

describe('customSort', () => {
  it('should handle `undefined` and `null` correctly', () => {
    const result = [undefined, null, null].sort((a, b) => customSort(a, b, 'key'));
    expect(result).toEqual([null, null, undefined]);
  });

  describe('should correctly sort based on provided keys and reverse flags', () => {
    describe('with only a primary key', () => {
      describe('when `reversePrimarySort` is set to `false` (default)', () => {
        it('number', () => {
          const a = { key: 4 };
          const b = { key: 6 };
          const c = { key: 2 };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key'));
          expect(result).toEqual([c, a, b]);
        });

        it('string', () => {
          const a = { key: '111' };
          const b = { key: '22' };
          const c = { key: '3' };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key'));
          expect(result).toEqual([a, b, c]);
        });

        it('boolean', () => {
          const a = { key: false };
          const b = { key: false };
          const c = { key: true };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key'));
          expect(result).toEqual([c, a, b]);
        });

        it('null', () => {
          const a = { key: null };
          const b = { key: null };
          const c = { key: null };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key'));
          expect(result).toEqual([a, b, c]);
        });

        it('undefined', () => {
          const a = { key: undefined };
          const b = { key: undefined };
          const c = { key: undefined };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key'));
          expect(result).toEqual([a, b, c]);
        });

        it('empty object', () => {
          const a = {};
          const b = {};
          const c = {};

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key'));
          expect(result).toEqual([a, b, c]);
        });

        it('nested object', () => {
          const a = { outerKey: { innerKey: '3' } };
          const b = { outerKey: { innerKey: '5' } };
          const c = { outerKey: { innerKey: '1' } };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'outerKey.innerKey'));
          expect(result).toEqual([c, a, b]);
        });

        it('deep-nested object', () => {
          const a = { outerKey: { innerKey1: { x: '3', y: 10 }, innerKey2: null } };
          const b = { outerKey: { innerKey1: { x: '5', y: 10 }, innerKey2: 'value' } };
          const c = { outerKey: { innerKey1: { x: '1', y: 10 }, innerKey2: undefined } };

          const result = [a, b, c].sort((a, b) =>
            customSort(a, b, 'outerKey.innerKey1.x'),
          );
          expect(result).toEqual([c, a, b]);
        });
      });

      describe('when `reversePrimarySort` is set to `true`', () => {
        it('number', () => {
          const a = { key: 4 };
          const b = { key: 6 };
          const c = { key: 2 };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key', true));
          expect(result).toEqual([b, a, c]);
        });

        it('string', () => {
          const a = { key: '111' };
          const b = { key: '22' };
          const c = { key: '3' };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key', true));
          expect(result).toEqual([c, b, a]);
        });

        it('boolean', () => {
          const a = { key: false };
          const b = { key: false };
          const c = { key: true };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key', true));
          expect(result).toEqual([a, b, c]);
        });

        it('null', () => {
          const a = { key: null };
          const b = { key: null };
          const c = { key: null };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key', true));
          expect(result).toEqual([c, b, a]);
        });

        it('undefined', () => {
          const a = { key: undefined };
          const b = { key: undefined };
          const c = { key: undefined };

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key', true));
          expect(result).toEqual([c, b, a]);
        });

        it('empty object', () => {
          const a = {};
          const b = {};
          const c = {};

          const result = [a, b, c].sort((a, b) => customSort(a, b, 'key', true));
          expect(result).toEqual([c, b, a]);
        });

        it('nested object', () => {
          const a = { outerKey: { innerKey: '3' } };
          const b = { outerKey: { innerKey: '5' } };
          const c = { outerKey: { innerKey: '1' } };

          const result = [a, b, c].sort((a, b) =>
            customSort(a, b, 'outerKey.innerKey', true),
          );
          expect(result).toEqual([b, a, c]);
        });

        it('deep-nested object', () => {
          const a = { outerKey: { innerKey1: { x: '3', y: 10 }, innerKey2: null } };
          const b = { outerKey: { innerKey1: { x: '5', y: 10 }, innerKey2: 'value' } };
          const c = { outerKey: { innerKey1: { x: '1', y: 10 }, innerKey2: undefined } };

          const result = [a, b, c].sort((a, b) =>
            customSort(a, b, 'outerKey.innerKey1.x', true),
          );
          expect(result).toEqual([b, a, c]);
        });
      });
    });

    describe('with both a primary and secondary key', () => {
      it('should ignore secondary key if can be sorted by primary key (`reversePrimarySort` = false)', () => {
        const a = { outerKey: { innerKey1: '3', innerKey2: 'z' } };
        const b = { outerKey: { innerKey1: '5', innerKey2: 'y' } };
        const c = { outerKey: { innerKey1: '1', innerKey2: 'x' } };

        const result = [a, b, c].sort((a, b) =>
          customSort(a, b, 'outerKey.innerKey2', false, 'outerKey.innerKey1'),
        );
        expect(result).toEqual([c, b, a]);
      });

      it('should ignore secondary key if can be sorted by primary key (`reversePrimarySort` = true)', () => {
        const a = { outerKey: { innerKey1: '3', innerKey2: 'z' } };
        const b = { outerKey: { innerKey1: '5', innerKey2: 'y' } };
        const c = { outerKey: { innerKey1: '1', innerKey2: 'x' } };

        const result = [a, b, c].sort((a, b) =>
          customSort(a, b, 'outerKey.innerKey2', true, 'outerKey.innerKey1'),
        );
        expect(result).toEqual([a, b, c]);
      });

      it('should sort by secondary key if sort by primary key resulted in 0 (`reversePrimarySort` = false)', () => {
        const a = { outerKey: { innerKey1: true, innerKey2: 'z' } };
        const b = { outerKey: { innerKey1: true, innerKey2: 'x' } };
        const c = { outerKey: { innerKey1: true, innerKey2: 'y' } };

        const result = [a, b, c].sort((a, b) =>
          customSort(a, b, 'outerKey.innerKey1', false, 'outerKey.innerKey2'),
        );
        expect(result).toEqual([b, c, a]);
      });

      it('should sort by secondary key if sort by primary key resulted in 0 (`reversePrimarySort` = true)', () => {
        const a = { outerKey: { innerKey1: true, innerKey2: 'z' } };
        const b = { outerKey: { innerKey1: true, innerKey2: 'x' } };
        const c = { outerKey: { innerKey1: true, innerKey2: 'y' } };

        const result = [a, b, c].sort((a, b) =>
          customSort(a, b, 'outerKey.innerKey1', true, 'outerKey.innerKey2', true),
        );
        expect(result).toEqual([a, c, b]);
      });
    });

    describe('with rating fields (provisional vs non-provisional)', () => {
      it('should sort by base rating when ratings are different', () => {
        const a = { rating: '1800' };
        const b = { rating: '1900/5' };
        const c = { rating: '1700/10' };

        const result = [a, b, c].sort((a, b) => customSort(a, b, 'rating'));
        expect(result).toEqual([c, a, b]);
      });

      it('should place provisional before non-provisional when base ratings are equal (ascending)', () => {
        const a = { rating: '1800' };
        const b = { rating: '1800/5' };
        const c = { rating: '1800/12' };

        const result = [b, c, a].sort((a, b) => customSort(a, b, 'rating'));
        expect(result).toEqual([b, c, a]);
      });

      it('should place non-provisional before provisional when base ratings are equal (descending)', () => {
        const a = { rating: '1800' };
        const b = { rating: '1800/5' };
        const c = { rating: '1800/12' };

        const result = [b, c, a].sort((a, b) => customSort(a, b, 'rating', true));
        expect(result).toEqual([a, c, b]);
      });

      it('should handle multiple members with mixed provisional and non-provisional ratings', () => {
        const a = { rating: '2000' };
        const b = { rating: '1800/5' };
        const c = { rating: '1900' };
        const d = { rating: '1800' };
        const e = { rating: '1900/3' };

        const result = [a, b, c, d, e].sort((a, b) => customSort(a, b, 'rating', true));
        expect(result).toEqual([a, c, e, d, b]);
      });

      it('should apply same logic to peakRating field', () => {
        const a = { peakRating: '1800' };
        const b = { peakRating: '1800/5' };

        const result = [b, a].sort((a, b) => customSort(a, b, 'peakRating'));
        expect(result).toEqual([b, a]);
      });
    });
  });
});
