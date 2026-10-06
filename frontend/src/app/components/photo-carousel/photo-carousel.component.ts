import { ButtonComponent, PauseIconComponent, PlayIconComponent } from '@eagami/ui';
import { EMPTY, Subject, merge, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { Image } from '@app/models';

@Component({
  selector: 'lcc-photo-carousel',
  templateUrl: './photo-carousel.component.html',
  styleUrl: './photo-carousel.component.scss',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.arrowleft)': 'onPreviousPhoto()',
    '(keydown.arrowright)': 'onNextPhoto()',
    '(mouseenter)': 'isHovered.set(true)',
    '(mouseleave)': 'isHovered.set(false)',
    '(focusin)': 'hasFocus.set(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class PhotoCarouselComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  public readonly photos = input.required<Partial<Image>[]>();

  public readonly currentIndex = signal(0);

  protected readonly pauseIcon = PauseIconComponent;
  protected readonly playIcon = PlayIconComponent;

  // Starts paused for visitors who ask for less motion
  protected readonly isPaused = signal(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  protected readonly isHovered = signal(false);
  protected readonly hasFocus = signal(false);

  // Holds still while someone is looking at or using it
  private readonly isCycling = computed(
    () => !this.isPaused() && !this.isHovered() && !this.hasFocus(),
  );
  private readonly isCycling$ = toObservable(this.isCycling);

  private readonly autoCycleSubject$ = new Subject<void>();

  public ngOnInit(): void {
    merge(this.isCycling$, this.autoCycleSubject$.pipe(map(() => this.isCycling())))
      .pipe(
        switchMap(isCycling => (isCycling ? timer(4000, 4000) : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.showNextPhoto());
  }

  public onFocusOut(event: FocusEvent): void {
    this.hasFocus.set(
      this.elementRef.nativeElement.contains(event.relatedTarget as Node),
    );
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
