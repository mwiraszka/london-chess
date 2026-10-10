/**
 * Calculate the aspect ratio for an image based on its width and height.
 * Returns a CSS-compatible aspect-ratio value.
 *
 * @param width - The width of the image in pixels
 * @param height - The height of the image in pixels
 * @returns A string in the format "width / height" for CSS aspect-ratio property
 *
 * @example
 * calculateAspectRatio(1920, 1080) // returns "16 / 9"
 * calculateAspectRatio(800, 600) // returns "4 / 3"
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) {
    throw new Error('Width and height must be greater than 0');
  }

  // Find the greatest common divisor to simplify the ratio
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

  const divisor = gcd(width, height);
  const simplifiedWidth = width / divisor;
  const simplifiedHeight = height / divisor;

  return `${simplifiedWidth} / ${simplifiedHeight}`;
}
