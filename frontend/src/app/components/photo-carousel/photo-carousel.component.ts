import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

import { ChangeDetectionStrategy, Component, OnInit, input, signal } from '@angular/core';

import { Image } from '@app/models';

@UntilDestroy()
@Component({
  selector: 'lcc-photo-carousel',
  templateUrl: './photo-carousel.component.html',
  styleUrl: './photo-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    tabindex: '0',
    '(keydown.arrowleft)': 'onPreviousPhoto()',
    '(keydown.arrowright)': 'onNextPhoto()',
    '(keydown.enter)': 'onNextPhoto()',
  },
})
export class PhotoCarouselComponent implements OnInit {
  public readonly photos = input.required<Partial<Image>[]>();

  public readonly currentIndex = signal(0);

  private readonly autoCycleSubject$ = new Subject<void>();

  public ngOnInit(): void {
    this.autoCycleSubject$
      .pipe(
        startWith(null),
        switchMap(() => timer(4000, 4000)),
        untilDestroyed(this),
      )
      .subscribe(() => this.showNextPhoto());
  }

  public onPreviousPhoto(): void {
    const count = this.photos().length;
    this.currentIndex.update(index => (index - 1 + count) % count);
    this.autoCycleSubject$.next();
  }

  public onNextPhoto(): void {
    this.showNextPhoto();
    this.autoCycleSubject$.next();
  }

  public onSelectPhoto(index: number): void {
    this.currentIndex.set(index);
    this.autoCycleSubject$.next();
  }

  private showNextPhoto(): void {
    this.currentIndex.update(index => (index + 1) % this.photos().length);
  }
}
