import { Technology } from '@app/models';

// Mirrors the "Under the hood" table in README.md
export const TECHNOLOGIES: Technology[] = [
  { name: 'Angular', purpose: 'frontend framework', icon: 'angular' },
  { name: 'Chart.js', purpose: 'charts for game and player stats', icon: 'chartjs' },
  { name: 'Clerk', purpose: 'user management and authentication', icon: 'clerk' },
  {
    name: 'Cloudflare R2',
    purpose: 'cloud storage for all site images',
    icon: 'cloudflare-r2',
  },
  { name: 'Eagami UI', purpose: 'Angular component and icon library', icon: 'eagami-ui' },
  { name: 'Express.js', purpose: 'Node.js API framework', icon: 'expressjs' },
  { name: 'GitHub Actions', purpose: 'CI and deployment workflows', icon: 'github' },
  {
    name: 'Lichess PGN Viewer',
    purpose: 'interactive chess game replays',
    icon: 'lichess',
  },
  { name: 'MongoDB', purpose: 'document database', icon: 'mongodb' },
  { name: 'NgRx', purpose: 'reactive state management', icon: 'ngrx' },
  {
    name: 'Ngx Markdown',
    purpose: 'markdown rendering for articles',
    icon: 'ngx-markdown',
  },
  { name: 'Sentry', purpose: 'error tracking', icon: 'sentry' },
  { name: 'Vercel', purpose: 'hosting for the site and API', icon: 'vercel' },
  { name: 'Vitest', purpose: 'unit testing', icon: 'vitest' },
];
