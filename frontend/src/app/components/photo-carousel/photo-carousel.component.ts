import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnInit,
  inject,
} from '@angular/core';

import { Image } from '@app/models';

@UntilDestroy()
@Component({
  selector: 'lcc-photo-carousel',
  templateUrl: './photo-carousel.component.html',
  styleUrl: './photo-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { tabindex: '0' },
})
export class PhotoCarouselComponent implements OnInit {
  @Input({ required: true }) public photos!: Partial<Image>[];

  public currentIndex = 0;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly autoCycleSubject$ = new Subject<void>();

  public ngOnInit(): void {
    this.autoCycleSubject$
      .pipe(
        startWith(null),
        switchMap(() => timer(4000, 4000)),
        untilDestroyed(this),
      )
      .subscribe(() => {
        this.currentIndex = (this.currentIndex + 1) % this.photos.length;
        this.changeDetectorRef.markForCheck();
      });
  }

  @HostListener('keydown.arrowleft')
  public onPreviousPhoto(): void {
    this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this.autoCycleSubject$.next();
  }

  @HostListener('keydown.arrowright')
  @HostListener('keydown.enter')
  public onNextPhoto(): void {
    this.currentIndex = (this.currentIndex + 1) % this.photos.length;
    this.autoCycleSubject$.next();
  }

  public onSelectPhoto(index: number): void {
    this.currentIndex = index;
    this.autoCycleSubject$.next();
  }
}
