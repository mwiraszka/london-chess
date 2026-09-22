import { compareCells } from './compare-cells.util';

describe('compareCells', () => {
  const rows = [
    { score: 3.5, name: 'Bea', rating: null },
    { score: 1, name: 'ann', rating: 1500 },
    { score: null, name: 'Cy', rating: 1200 },
  ];

  it('should order numbers by size', () => {
    const sorted = [...rows].sort((a, b) => compareCells(a, b, 'rating'));

    expect(sorted.map(({ rating }) => rating)).toEqual([null, 1200, 1500]);
  });

  it('should order text by letters, whatever their case', () => {
    const sorted = [...rows].sort((a, b) => compareCells(a, b, 'name'));

    expect(sorted.map(({ name }) => name)).toEqual(['ann', 'Bea', 'Cy']);
  });

  it('should put missing values first', () => {
    const sorted = [...rows].sort((a, b) => compareCells(a, b, 'score'));

    expect(sorted.map(({ score }) => score)).toEqual([null, 1, 3.5]);
  });
});
