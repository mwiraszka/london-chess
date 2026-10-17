import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AdminAction, AdminButton, InternalLink } from '@app/models';
import { AdminActionsService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { query } from '@app/utils';

import { AdminActionsComponent } from './admin-actions.component';

@Component({ selector: 'lcc-test-icon', template: '' })
class IconComponent {}

describe('AdminActionsComponent', () => {
  let fixture: ComponentFixture<AdminActionsComponent>;
  let store: MockStore;

  const addEvent: InternalLink = {
    text: 'Add an event',
    internalPath: ['event', 'add'],
    icon: IconComponent,
  };
  let exportEvents: AdminButton;

  const offer = (actions: AdminAction[]): void =>
    TestBed.runInInjectionContext(() =>
      TestBed.inject(AdminActionsService).register(() => actions),
    );

  const render = (isAdmin: boolean): void => {
    store.overrideSelector(AuthSelectors.selectIsAdmin, isAdmin);
    store.refreshState();
    fixture.detectChanges();
  };

  const menuItems = (): HTMLButtonElement[] =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

  const openMenu = (): void => {
    query(fixture.debugElement, '.admin-actions-button button').nativeElement.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    exportEvents = {
      id: 'export-to-csv',
      tooltip: 'Export to CSV',
      icon: IconComponent,
      action: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminActionsComponent],
      providers: [provideMockStore(), provideRouter([])],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AdminActionsComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should stay hidden from anyone but an admin', () => {
    offer([addEvent]);

    render(false);

    expect(query(fixture.debugElement, '.admin-actions-button')).toBeNull();
  });

  it('should stay hidden while nothing on screen offers an action', () => {
    render(true);

    expect(query(fixture.debugElement, '.admin-actions-button')).toBeNull();
  });

  it('should list every action on screen in its menu', () => {
    offer([addEvent, exportEvents]);
    render(true);

    openMenu();

    expect(menuItems().map(item => item.textContent?.trim())).toEqual([
      'Add an event',
      'Export to CSV',
    ]);
  });

  it('should open the page an action leads to', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    offer([addEvent]);
    render(true);
    openMenu();

    menuItems()[0].click();

    expect(navigate).toHaveBeenCalledWith(['/event/add'], { queryParams: undefined });
  });

  it('should carry out an action that does something', () => {
    offer([exportEvents]);
    render(true);
    openMenu();

    menuItems()[0].click();

    expect(exportEvents.action).toHaveBeenCalledOnce();
  });
});
