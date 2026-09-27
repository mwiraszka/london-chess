import { XIconComponent } from '@eagami/ui';

import { NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Event, EventType } from '@app/models';
import { FormatDatePipe } from '@app/pipes';

@Component({
  selector: 'lcc-upcoming-event-banner',
  templateUrl: './upcoming-event-banner.component.html',
  styleUrl: './upcoming-event-banner.component.scss',
  imports: [FormatDatePipe, NgTemplateOutlet, RouterLink, XIconComponent],
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

  private readonly bannerMessageRef = viewChild.required('bannerMessage', {
    read: ElementRef,
  });

  private readonly marqueeContentRef = viewChild.required('marqueeContent', {
    read: ElementRef,
  });

  public readonly nextEvents = input.required<Event[]>();

  public readonly clearBanner = output<void>();

  protected readonly shouldAnimate = signal(false);
  protected readonly animationDuration = signal(20);

  protected readonly backgroundStyling = computed(() => {
    const nextEvents = this.nextEvents();
    const colorVar = (type: EventType) =>
      `var(--lcc-color--upcomingEventBanner-background-${this.TYPE_COLOR_VARS[type]})`;

    if (nextEvents.length === 1) {
      return colorVar(nextEvents[0].type);
    }
    const stops = nextEvents.flatMap((event, i) => {
      const color = colorVar(event.type);
      return [`${color} ${i * 20}px`, `${color} ${(i + 1) * 20}px`];
    });
    return `repeating-linear-gradient(-45deg, ${stops.join(', ')})`;
  });

  private resizeObserver?: ResizeObserver;
  private scrollDelayTimeoutId?: ReturnType<typeof setTimeout>;

  public ngAfterViewInit(): void {
    // Do not scroll for first 2 seconds to allow user to read the start of the message
    this.scrollDelayTimeoutId = setTimeout(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkOverflow();
      });
      this.resizeObserver.observe(this.bannerMessageRef().nativeElement);
    }, 2000);
  }

  public ngOnDestroy(): void {
    clearTimeout(this.scrollDelayTimeoutId);
    this.resizeObserver?.disconnect();
  }

  private checkOverflow(): void {
    const containerWidth = this.bannerMessageRef().nativeElement.offsetWidth;
    const contentWidth = this.marqueeContentRef().nativeElement.scrollWidth;

    // Calculate actual content width accounting for duplicates if present
    const singleItemWidth = this.shouldAnimate() ? contentWidth / 2 : contentWidth;

    this.shouldAnimate.set(singleItemWidth > containerWidth);

    if (this.shouldAnimate()) {
      // Calculate duration based on content width: ~50 pixels per second for smooth scrolling
      this.animationDuration.set(singleItemWidth / 50);
    }
  }
}
