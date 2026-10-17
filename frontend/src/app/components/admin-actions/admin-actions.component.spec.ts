import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AdminAction, AdminCommandAction, AdminLinkAction } from '@app/models';
import { AdminActionsService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { query } from '@app/utils';

import { AdminActionsComponent } from './admin-actions.component';

@Component({ selector: 'lcc-test-icon', template: '' })
class IconComponent {}

describe('AdminActionsComponent', () => {
  let fixture: ComponentFixture<AdminActionsComponent>;
  let store: MockStore;

  const addEvent: AdminLinkAction = {
    label: 'Add event',
    icon: IconComponent,
    group: 'add',
    path: ['event', 'add'],
  };
  const addArticle: AdminLinkAction = {
    label: 'Add article',
    icon: IconComponent,
    group: 'add',
    path: ['article', 'add'],
  };
  let exportEvents: AdminCommandAction;
  let deleteTournament: AdminCommandAction;

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

  // Each item and divider in the open menu, in order
  const menuEntries = (): string[] =>
    Array.from(
      document.querySelectorAll(
        '[role="menu"] [role="menuitem"], [role="menu"] [role="separator"]',
      ),
    ).map(entry =>
      entry.getAttribute('role') === 'separator'
        ? '---'
        : (entry.textContent?.trim() ?? ''),
    );

  const openMenu = (): void => {
    query(fixture.debugElement, '.admin-actions-button button').nativeElement.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    exportEvents = {
      label: 'Export events to CSV',
      icon: IconComponent,
      group: 'data',
      run: vi.fn(),
    };
    deleteTournament = {
      label: 'Delete tournament',
      icon: IconComponent,
      group: 'delete',
      run: vi.fn(),
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

  it('should group like actions, with a divider between the groups', () => {
    offer([addEvent, exportEvents]);
    offer([deleteTournament, addArticle]);
    render(true);

    openMenu();

    expect(menuEntries()).toEqual([
      'Add event',
      'Add article',
      '---',
      'Export events to CSV',
      '---',
      'Delete tournament',
    ]);
  });

  it('should mark deleting as dangerous', () => {
    offer([addEvent, deleteTournament]);
    render(true);

    openMenu();

    expect(
      menuItems().map(item => item.classList.contains('ea-menu-item--danger')),
    ).toEqual([false, true]);
  });

  it('should open the page an action leads to', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    offer([addEvent]);
    render(true);
    openMenu();

    menuItems()[0].click();

    expect(navigate).toHaveBeenCalledWith(['/event/add']);
  });

  it('should carry out an action that does something', () => {
    offer([exportEvents]);
    render(true);
    openMenu();

    menuItems()[0].click();

    expect(exportEvents.run).toHaveBeenCalledOnce();
  });
});
