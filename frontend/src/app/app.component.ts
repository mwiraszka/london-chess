import { ToastComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';
import { Observable, combineLatest } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthDrawerComponent } from '@app/components/auth-drawer/auth-drawer.component';
import { EnvironmentTagComponent } from '@app/components/environment-tag/environment-tag.component';
import { FooterComponent } from '@app/components/footer/footer.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { NavigationBarComponent } from '@app/components/navigation-bar/navigation-bar.component';
import { PullToRefreshIndicatorComponent } from '@app/components/pull-to-refresh-indicator/pull-to-refresh-indicator.component';
import { UpcomingEventBannerComponent } from '@app/components/upcoming-event-banner/upcoming-event-banner.component';
import { GIT_BRANCH_NAME } from '@app/constants/git-branch.generated';
import { Event, IsoDate } from '@app/models';
import { RefreshService, RoutingService, TouchEventsService } from '@app/services';
import { AppActions, AppSelectors } from '@app/store/app';
import { EventsSelectors } from '@app/store/events';

import { environment } from '@env';

@UntilDestroy()
@Component({
  selector: 'app-root',
  template: `
    @if (viewModel$ | async; as vm) {
      @if (vm.showUpcomingEventBanner && vm.nextEvents.length) {
        <lcc-upcoming-event-banner
          [nextEvents]="vm.nextEvents"
          (clearBanner)="onClearBanner()">
        </lcc-upcoming-event-banner>
      }

      <lcc-header></lcc-header>

      <lcc-navigation-bar></lcc-navigation-bar>

      <lcc-pull-to-refresh-indicator />

      <main
        #mainElement
        cdkScrollable>
        <router-outlet></router-outlet>
        <lcc-footer></lcc-footer>
      </main>
    }

    @if (!environment.production) {
      <lcc-environment-tag
        [branchName]="gitBranchName"
        [isPreview]="environment.isPreview">
      </lcc-environment-tag>
    }

    <lcc-auth-drawer></lcc-auth-drawer>
    <ea-toast></ea-toast>
  `,
  styleUrl: './app.component.scss',
  imports: [
    AuthDrawerComponent,
    CdkScrollableModule,
    CommonModule,
    EnvironmentTagComponent,
    FooterComponent,
    HeaderComponent,
    NavigationBarComponent,
    PullToRefreshIndicatorComponent,
    RouterOutlet,
    ToastComponent,
    UpcomingEventBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit {
  protected readonly environment = environment;
  protected readonly gitBranchName = GIT_BRANCH_NAME;

  @ViewChild('mainElement', { read: ElementRef })
  public mainElement!: ElementRef<HTMLElement>;

  public viewModel$?: Observable<{
    bannerLastCleared: IsoDate | null;
    isDarkMode: boolean;
    isDesktopView: boolean;
    isWideView: boolean;
    nextEvents: Event[];
    showUpcomingEventBanner: boolean;
  }>;

  constructor(
    @Inject(DOCUMENT) private readonly _document: Document,
    private readonly refreshService: RefreshService,
    private readonly routingService: RoutingService,
    private readonly store: Store,
    private readonly touchEventsService: TouchEventsService,
  ) {
    moment.tz.setDefault('America/Toronto');
  }

  public ngOnInit(): void {
    this.touchEventsService.listenForTouchEvents();

    this.viewModel$ = combineLatest([
      this.store.select(AppSelectors.selectBannerLastCleared),
      this.store.select(AppSelectors.selectIsDarkMode),
      this.store.select(AppSelectors.selectIsDesktopView),
      this.store.select(AppSelectors.selectIsWideView),
      this.store.select(EventsSelectors.selectConcurrentNextEvents),
      this.store.select(AppSelectors.selectShowUpcomingEventBanner),
    ]).pipe(
      untilDestroyed(this),
      map(
        ([
          bannerLastCleared,
          isDarkMode,
          isDesktopView,
          isWideView,
          nextEvents,
          showUpcomingEventBanner,
        ]) => ({
          bannerLastCleared,
          isDarkMode,
          isDesktopView,
          isWideView,
          nextEvents,
          showUpcomingEventBanner,
        }),
      ),
      tap(({ isDarkMode }) => {
        const theme = isDarkMode ? 'dark' : 'light';
        // @eagami/ui keys its themed tokens off <html data-theme>, while the
        // app's own styles key off <body data-theme>
        this._document.documentElement.setAttribute('data-theme', theme);
        this._document.body.setAttribute('data-theme', theme);
      }),
    );

    this.store
      .select(AppSelectors.selectIsDesktopView)
      .pipe(untilDestroyed(this))
      .subscribe(isDesktopView => {
        this.updateViewportForDesktopView(isDesktopView);
      });

    this.store
      .select(AppSelectors.selectIsWideView)
      .pipe(untilDestroyed(this))
      .subscribe(isWideView => {
        this._document.body.setAttribute('data-wide-view', isWideView ? 'true' : 'false');
      });
  }

  public ngAfterViewInit(): void {
    this.refreshService.initialize(this.mainElement.nativeElement);
    this.initNavigationListenerForScrollingBackToTop();
    this.measureScrollbarInset();
    window.addEventListener('resize', () => this.measureScrollbarInset());
  }

  // The classic scrollbar's width varies by browser; publishing it as a
  // variable lets the scroller mirror it on its left edge and the nav apply
  // the same inset, keeping everything on one centre line
  private measureScrollbarInset(): void {
    const main = this.mainElement.nativeElement;
    const inset = main.offsetWidth - main.clientWidth;
    this._document.documentElement.style.setProperty(
      '--lcc-scrollbar-inset',
      `${inset}px`,
    );
  }

  public onClearBanner(): void {
    this.store.dispatch(AppActions.upcomingEventBannerCleared());
  }

  private initNavigationListenerForScrollingBackToTop(): void {
    this.routingService.pageNavigated$
      .pipe(
        untilDestroyed(this),
        filter(fragment => !fragment),
      )
      .subscribe(() => this.mainElement.nativeElement.scrollTo({ top: 0 }));
  }

  private updateViewportForDesktopView(isDesktopView: boolean): void {
    const viewport = this._document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      return;
    }

    if (isDesktopView) {
      const targetWidth = 1200;
      const scale = window.innerWidth / targetWidth;
      viewport.setAttribute(
        'content',
        `width=${targetWidth}, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=3.0, user-scalable=yes`,
      );
    } else {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
  }
}
