import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Technology {
  name: string;
  purpose: string;
  icon: string;
}

// Mirrors the "Under the hood" table in README.md
const TECHNOLOGIES: Technology[] = [
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

/**
 * The tools this site is built with, arranged in a ring around the club logo.
 * Hovering or tapping one names it below and lifts its neighbours with it.
 */
@Component({
  selector: 'lcc-tech-ring',
  templateUrl: './tech-ring.component.html',
  styleUrl: './tech-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechRingComponent {
  protected readonly technologies = TECHNOLOGIES;
  protected readonly activeIndex = signal<number | null>(null);

  protected iconPath(technology: Technology): string {
    return `assets/tech-icons/${technology.icon}.png`;
  }

  protected isNeighbour(index: number): boolean {
    return this.ringDistance(index) === 1;
  }

  protected isOuterNeighbour(index: number): boolean {
    return this.ringDistance(index) === 2;
  }

  // Steps around the ring rather than along the list, so the first and last
  // icons count as neighbours
  private ringDistance(index: number): number | null {
    const active = this.activeIndex();
    if (active === null) {
      return null;
    }
    const steps = Math.abs(active - index);
    return Math.min(steps, this.technologies.length - steps);
  }

  // Touch fires no hover, so a tap is what names the tool it lands on
  protected onSelect(index: number): void {
    this.activeIndex.set(index);
  }

  protected onLeave(index: number): void {
    if (this.activeIndex() === index) {
      this.activeIndex.set(null);
    }
  }
}
