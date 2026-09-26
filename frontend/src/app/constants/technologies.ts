import { Technology } from '@app/models';

// Mirrors the "Under the hood" table in README.md
export const TECHNOLOGIES: Technology[] = [
  { name: 'Angular', purpose: 'frontend framework', icon: 'angular.png' },
  { name: 'Clerk', purpose: 'user management and authentication', icon: 'clerk.png' },
  {
    name: 'Cloudflare R2',
    purpose: 'cloud storage for all site images',
    icon: 'cloudflare-r2.png',
  },
  {
    name: 'Eagami UI',
    purpose: 'Angular component and icon library',
    icon: 'eagami-ui.png',
  },
  { name: 'Express.js', purpose: 'Node.js API framework', icon: 'expressjs.png' },
  { name: 'GitHub Actions', purpose: 'CI and deployment workflows', icon: 'github.png' },
  {
    name: 'Lichess PGN Viewer',
    purpose: 'interactive chess game replays',
    icon: 'lichess.png',
  },
  { name: 'MongoDB', purpose: 'document database', icon: 'mongodb.png' },
  { name: 'NgRx', purpose: 'reactive state management', icon: 'ngrx.png' },
  {
    name: 'Ngx Markdown',
    purpose: 'markdown rendering for articles',
    icon: 'ngx-markdown.png',
  },
  { name: 'Playwright', purpose: 'end-to-end testing', icon: 'playwright.svg' },
  { name: 'Sentry', purpose: 'error tracking', icon: 'sentry.png' },
  { name: 'Vercel', purpose: 'hosting for the site and API', icon: 'vercel.png' },
  { name: 'Vitest', purpose: 'unit testing', icon: 'vitest.png' },
];
