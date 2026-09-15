import {
  calculateAspectRatio,
  calculateDecimalAspectRatio,
} from './calculate-aspect-ratio.util';

const errorMessage = 'Width and height must be greater than 0';

describe('calculateAspectRatio', () => {
  it('should calculate correct aspect ratio for common resolutions', () => {
    expect(calculateAspectRatio(1920, 1080)).toBe('16 / 9');
    expect(calculateAspectRatio(1280, 720)).toBe('16 / 9');
    expect(calculateAspectRatio(800, 600)).toBe('4 / 3');
    expect(calculateAspectRatio(1024, 768)).toBe('4 / 3');
    expect(calculateAspectRatio(1200, 1200)).toBe('1 / 1');
  });

  it('should handle non-standard resolutions', () => {
    expect(calculateAspectRatio(1366, 768)).toBe('683 / 384');
    expect(calculateAspectRatio(640, 480)).toBe('4 / 3');
  });

  it('should throw error for invalid dimensions', () => {
    expect(() => calculateAspectRatio(0, 100)).toThrow(errorMessage);
    expect(() => calculateAspectRatio(100, 0)).toThrow(errorMessage);
    expect(() => calculateAspectRatio(-100, 100)).toThrow(errorMessage);
  });
});

describe('calculateDecimalAspectRatio', () => {
  it('should calculate correct decimal aspect ratio', () => {
    expect(calculateDecimalAspectRatio(1920, 1080)).toBeCloseTo(1.7778, 4);
    expect(calculateDecimalAspectRatio(800, 600)).toBeCloseTo(1.3333, 4);
    expect(calculateDecimalAspectRatio(1200, 1200)).toBe(1);
  });

  it('should throw error for invalid dimensions', () => {
    expect(() => calculateDecimalAspectRatio(0, 100)).toThrow(errorMessage);
    expect(() => calculateDecimalAspectRatio(100, 0)).toThrow(errorMessage);
    expect(() => calculateDecimalAspectRatio(-100, 100)).toThrow(errorMessage);
  });
});
