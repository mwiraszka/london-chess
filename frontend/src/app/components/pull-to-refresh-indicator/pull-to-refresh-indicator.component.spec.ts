import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefreshService } from '@app/services';
import { query } from '@app/utils';

import { PullToRefreshIndicatorComponent } from './pull-to-refresh-indicator.component';

describe('PullToRefreshIndicatorComponent', () => {
  let fixture: ComponentFixture<PullToRefreshIndicatorComponent>;

  const isRefreshing = signal(false);
  const pullProgress = signal(0);

  function host(): HTMLElement {
    return fixture.nativeElement;
  }

  beforeEach(async () => {
    isRefreshing.set(false);
    pullProgress.set(0);

    await TestBed.configureTestingModule({
      imports: [PullToRefreshIndicatorComponent],
      providers: [{ provide: RefreshService, useValue: { isRefreshing, pullProgress } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PullToRefreshIndicatorComponent);
    fixture.detectChanges();
  });

  it('should render nothing while the page is at rest', () => {
    expect(query(fixture.debugElement, '.indicator')).toBeFalsy();
    expect(host().classList).not.toContain('refreshing');
  });

  it('should follow the pull with a refresh icon', () => {
    pullProgress.set(0.5);
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'ea-icon-refresh-cw.indicator')).toBeTruthy();
    expect(query(fixture.debugElement, 'ea-spinner')).toBeFalsy();
    expect(host().style.getPropertyValue('--lcc-pull-progress')).toBe('0.5');
  });

  it('should show a labelled spinner while refreshing', () => {
    isRefreshing.set(true);
    fixture.detectChanges();

    const spinner = query(fixture.debugElement, 'ea-spinner.indicator');
    expect(spinner).toBeTruthy();
    expect(spinner.componentInstance.label()).toBe('Refreshing');
    expect(query(fixture.debugElement, 'ea-icon-refresh-cw')).toBeFalsy();
    expect(host().classList).toContain('refreshing');
  });

  it('should disappear once the refresh ends', () => {
    isRefreshing.set(true);
    fixture.detectChanges();

    isRefreshing.set(false);
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.indicator')).toBeFalsy();
    expect(host().classList).not.toContain('refreshing');
  });
});
