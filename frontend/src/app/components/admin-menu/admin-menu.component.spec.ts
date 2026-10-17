import { ContextMenuTriggerDirective } from '@eagami/ui';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AdminControlsConfig } from '@app/models';
import { query } from '@app/utils';

import { AdminMenuComponent } from './admin-menu.component';

@Component({
  imports: [AdminMenuComponent, ContextMenuTriggerDirective],
  template: `
    <div
      class="item"
      [eaContextMenuTrigger]="adminMenu.menu()"
      [contextMenuData]="controls()">
      Blitz night
    </div>
    <lcc-admin-menu #adminMenu />
  `,
})
class HostComponent {
  readonly controls = signal<AdminControlsConfig | null>(null);
}

describe('AdminMenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let deleteCb: Mock;

  const menuItems = (): HTMLButtonElement[] =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

  const labels = (): string[] =>
    menuItems().map(item => item.textContent?.replace(/\s+/g, ' ').trim() ?? '');

  const openFor = (controls: Partial<AdminControlsConfig>): void => {
    fixture.componentInstance.controls.set({ deleteCb, ...controls });
    fixture.detectChanges();
    query(fixture.debugElement, '.item').nativeElement.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    deleteCb = vi.fn();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should name the item it acts on', () => {
    openFor({ itemName: 'Blitz night' });

    expect(document.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
      'Admin actions for Blitz night',
    );
  });

  it('should offer only deleting when the item has nothing else to do', () => {
    openFor({});

    expect(labels()).toEqual(['Delete']);
  });

  it('should offer bookmarking, editing and deleting, in that order', () => {
    openFor({ bookmarkCb: vi.fn(), bookmarked: false, editPath: ['event', 'edit', '1'] });

    expect(labels()).toEqual(['Bookmark', 'Edit', 'Delete']);
  });

  it('should set deleting apart from the other actions', () => {
    openFor({ editPath: ['event', 'edit', '1'] });

    const entries = Array.from(
      document.querySelectorAll(
        '[role="menu"] [role="menuitem"], [role="menu"] [role="separator"]',
      ),
    ).map(entry => entry.getAttribute('role'));

    expect(entries).toEqual(['menuitem', 'separator', 'menuitem']);
  });

  it('should offer to remove a bookmark the item already has', () => {
    openFor({ bookmarkCb: vi.fn(), bookmarked: true });

    expect(labels()).toEqual(['Remove bookmark', 'Delete']);
  });

  it('should delete the item', () => {
    openFor({});

    menuItems()[0].click();

    expect(deleteCb).toHaveBeenCalledOnce();
  });

  it('should explain why deleting is unavailable', () => {
    openFor({ isDeleteDisabled: true, deleteDisabledReason: 'Used in an article' });

    expect(menuItems()[0].disabled).toBe(true);
    expect(labels()).toEqual(['Delete Used in an article']);
  });

  it('should open the editor for the item', () => {
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    openFor({ editPath: ['event', 'edit', '1'] });

    menuItems()[0].click();

    expect(navigate).toHaveBeenCalledWith('/event/edit/1');
  });

  it('should open the editor in a new tab when asked to', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openFor({ editPath: ['image', 'edit', '7'], editInNewTab: true });

    menuItems()[0].click();

    expect(open).toHaveBeenCalledWith('/image/edit/7', '_blank', 'noopener,noreferrer');
  });
});
