import { Technology } from '@app/models';

// Mirrors the "Under the hood" table in README.md
export const TECHNOLOGIES: Technology[] = [
  { name: 'Angular', purpose: 'frontend framework', icon: 'angular.svg' },
  { name: 'Clerk', purpose: 'user management and authentication', icon: 'clerk.svg' },
  {
    name: 'Cloudflare R2',
    purpose: 'cloud storage for all site images',
    icon: 'cloudflare-r2.svg',
  },
  {
    name: 'Eagami UI',
    purpose: 'Angular component and icon library',
    icon: 'eagami-ui.svg',
  },
  { name: 'Express.js', purpose: 'Node.js API framework', icon: 'expressjs.svg' },
  { name: 'GitHub Actions', purpose: 'CI and deployment workflows', icon: 'github.svg' },
  {
    name: 'Lichess PGN Viewer',
    purpose: 'interactive chess game replays',
    icon: 'lichess.svg',
  },
  { name: 'MongoDB', purpose: 'document database', icon: 'mongodb.svg' },
  { name: 'NgRx', purpose: 'reactive state management', icon: 'ngrx.svg' },
  {
    name: 'Ngx Markdown',
    purpose: 'markdown rendering for articles',
    icon: 'ngx-markdown.svg',
  },
  { name: 'Playwright', purpose: 'end-to-end testing', icon: 'playwright.svg' },
  { name: 'Sentry', purpose: 'error tracking', icon: 'sentry.svg' },
  { name: 'Vercel', purpose: 'hosting for the site and API', icon: 'vercel.svg' },
  { name: 'Vitest', purpose: 'unit testing', icon: 'vitest.svg' },
];
