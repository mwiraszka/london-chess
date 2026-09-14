import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { TECHNOLOGIES } from '@app/constants/technologies';
import { Technology } from '@app/models';

/**
 * The tools this site is built with, arranged in a ring. Hovering or tapping one
 * names it in the middle of the ring and lifts its neighbours with it.
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

  protected isFarNeighbour(index: number): boolean {
    return this.ringDistance(index) === 3;
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
