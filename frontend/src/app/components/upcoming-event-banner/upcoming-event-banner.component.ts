import { XIconComponent } from '@eagami/ui';

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Event, EventType } from '@app/models';
import { FormatDatePipe } from '@app/pipes';

@Component({
  selector: 'lcc-upcoming-event-banner',
  templateUrl: './upcoming-event-banner.component.html',
  styleUrl: './upcoming-event-banner.component.scss',
  imports: [CommonModule, FormatDatePipe, RouterLink, XIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingEventBannerComponent implements AfterViewInit, OnDestroy {
  private readonly TYPE_COLOR_VARS: Record<EventType, string> = {
    'blitz tournament (10 mins)': 'blitz10Tournament',
    'rapid tournament (25 mins)': 'rapid25Tournament',
    'rapid tournament (40 mins)': 'rapid40Tournament',
    lecture: 'lecture',
    simul: 'simul',
    championship: 'championship',
    closed: 'closed',
    other: 'other',
  };

  @ViewChild('bannerMessage', { read: ElementRef })
  private bannerMessageRef!: ElementRef<HTMLElement>;

  @ViewChild('marqueeContent', { read: ElementRef })
  private marqueeContentRef!: ElementRef<HTMLElement>;

  @Input({ required: true }) public nextEvents!: Event[];

  @Output() public clearBanner = new EventEmitter<void>();

  protected shouldAnimate = false;
  protected animationDuration = 20;

  protected get backgroundStyling(): string {
    const colorVar = (type: EventType) =>
      `var(--lcc-color--upcomingEventBanner-background-${this.TYPE_COLOR_VARS[type]})`;

    if (this.nextEvents.length === 1) {
      return colorVar(this.nextEvents[0].type);
    }
    const stops = this.nextEvents.flatMap((event, i) => {
      const color = colorVar(event.type);
      return [`${color} ${i * 20}px`, `${color} ${(i + 1) * 20}px`];
    });
    return `repeating-linear-gradient(-45deg, ${stops.join(', ')})`;
  }

  private resizeObserver?: ResizeObserver;
  private scrollDelayTimeoutId?: ReturnType<typeof setTimeout>;

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  public ngAfterViewInit(): void {
    // Do not scroll for first 2 seconds to allow user to read the start of the message
    this.scrollDelayTimeoutId = setTimeout(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkOverflow();
      });
      this.resizeObserver.observe(this.bannerMessageRef.nativeElement);
    }, 2000);
  }

  public ngOnDestroy(): void {
    clearTimeout(this.scrollDelayTimeoutId);
    this.resizeObserver?.disconnect();
  }

  private checkOverflow(): void {
    const containerWidth = this.bannerMessageRef.nativeElement.offsetWidth;
    const contentWidth = this.marqueeContentRef.nativeElement.scrollWidth;

    // Calculate actual content width accounting for duplicates if present
    const singleItemWidth = this.shouldAnimate ? contentWidth / 2 : contentWidth;

    this.shouldAnimate = singleItemWidth > containerWidth;

    if (this.shouldAnimate) {
      // Calculate duration based on content width: ~50 pixels per second for smooth scrolling
      this.animationDuration = singleItemWidth / 50;
    }

    this.changeDetectorRef.markForCheck();
  }
}
