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
  });

  it('should follow the pull with a refresh icon', () => {
    pullProgress.set(0.5);
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.indicator ea-icon-refresh-cw')).toBeTruthy();
    expect(query(fixture.debugElement, '.indicator--refreshing')).toBeFalsy();
    expect(host().style.getPropertyValue('--lcc-pull-progress')).toBe('0.5');
  });

  it('should keep the arrows spinning, fully drawn, while the refresh runs', () => {
    pullProgress.set(1);
    fixture.detectChanges();

    pullProgress.set(0);
    isRefreshing.set(true);
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.indicator--refreshing')).toBeTruthy();
    expect(host().style.getPropertyValue('--lcc-pull-progress')).toBe('1');
  });

  it('should hide once the refresh is over', () => {
    isRefreshing.set(true);
    fixture.detectChanges();

    isRefreshing.set(false);
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.indicator')).toBeFalsy();
  });
});
