const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  // The end-to-end suite's build of the site
  'http://localhost:4300',
  'https://londonchess.ca',
  'https://www.londonchess.ca',
  'https://preview.londonchess.ca',
];

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}
