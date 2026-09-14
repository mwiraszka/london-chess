const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'https://londonchess.ca',
  'https://www.londonchess.ca',
];

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin);
}
