import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AdminControlsConfig } from '@app/models';
import { DialogService } from '@app/services';

import { AdminControlsDirective } from './admin-controls.directive';

@Component({
  template: `
    <div
      [adminControls]="config"
      style="width: 100px; height: 100px;">
    </div>
  `,
  imports: [AdminControlsDirective],
})
class TestComponent {
  config: AdminControlsConfig = {
    buttonSize: 34,
    deleteCb: vi.fn(),
    editPath: ['event', 'edit'],
    itemName: 'Test Item',
  };
}

describe('AdminControlsDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  let directiveElement: DebugElement;
  let directive: AdminControlsDirective;

  let mockDialogService: Partial<DialogService>;

  beforeEach(async () => {
    mockDialogService = {
      topDialogRef: null,
    };

    await TestBed.configureTestingModule({
      imports: [TestComponent, OverlayModule],
      providers: [Overlay, { provide: DialogService, useValue: mockDialogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    directiveElement = fixture.debugElement.query(By.directive(AdminControlsDirective));
    directive = directiveElement.injector.get(AdminControlsDirective);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  describe('onContextMenu', () => {
    let attachSpy: MockInstance;
    let preventDefaultSpy: MockInstance;
    let event: MouseEvent;

    beforeEach(() => {
      event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

      // @ts-expect-error Private class member
      attachSpy = vi.spyOn(directive, 'attach');
      preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    });

    it('should prevent default and attach controls when config is provided', () => {
      Object.defineProperty(window, 'getSelection', {
        writable: true,
        value: vi.fn().mockReturnValue({
          toString: () => '',
        }),
      });

      directiveElement.nativeElement.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(attachSpy).toHaveBeenCalled();
    });

    it('should not prevent default when text is selected', () => {
      Object.defineProperty(window, 'getSelection', {
        writable: true,
        value: vi.fn().mockReturnValue({
          toString: () => 'selected text',
        }),
      });

      directiveElement.nativeElement.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(attachSpy).not.toHaveBeenCalled();
    });

    it('should not attach when config is null', () => {
      component.config = null!;
      fixture.detectChanges();

      event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      vi.spyOn(event, 'preventDefault');

      directiveElement.nativeElement.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(attachSpy).not.toHaveBeenCalled();
    });
  });

  describe('attach', () => {
    let detachSpy: MockInstance;

    beforeEach(() => {
      detachSpy = vi.spyOn(directive, 'detach');
    });

    it('should create overlay and attach admin controls component', () => {
      // @ts-expect-error Private class member
      directive.attach();

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
      // @ts-expect-error Private class member
      expect(directive.adminControlsComponentRef).toBeTruthy();
    });

    it('should subscribe to component destroyed event', () => {
      // @ts-expect-error Private class member
      directive.attach();

      // @ts-expect-error Private class member
      directive.adminControlsComponentRef!.instance.destroyed.emit();

      expect(detachSpy).toHaveBeenCalled();
    });

    it('should set correct z-index when dialog is open', () => {
      Object.defineProperty(mockDialogService, 'topDialogRef', {
        value: {},
        writable: true,
      });

      // @ts-expect-error Private class member
      directive.attach();

      const overlayContainer = document.querySelector(
        '.cdk-overlay-container',
      ) as HTMLElement;

      expect(overlayContainer.style.zIndex).toBe('1100');
    });

    it('should set correct z-index when no dialog is open', () => {
      Object.defineProperty(mockDialogService, 'topDialogRef', {
        value: null,
        writable: true,
      });

      // @ts-expect-error Private class member
      directive.attach();

      const overlayContainer = document.querySelector(
        '.cdk-overlay-container',
      ) as HTMLElement;

      expect(overlayContainer.style.zIndex).toBe('900');
    });
  });

  describe('detach', () => {
    it('should detach overlay and remove event listeners', () => {
      // @ts-expect-error Private class member
      directive.attach();

      // @ts-expect-error Private class member
      const overlayDetachSpy = vi.spyOn(directive.overlayRef, 'detach');

      directive.detach();

      expect(overlayDetachSpy).toHaveBeenCalled();
    });

    it('should handle detach when overlay is not attached', () => {
      expect(() => directive.detach()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('should dispose overlay on destroy', () => {
      // @ts-expect-error Private class member
      directive.attach();

      // @ts-expect-error Private class member
      const overlayDisposeSpy = vi.spyOn(directive.overlayRef, 'dispose');

      directive.ngOnDestroy();

      expect(overlayDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    let detachSpy: MockInstance;

    beforeEach(() => {
      vi.useFakeTimers();

      // @ts-expect-error Private class member
      directive.attach();

      vi.runAllTimers();

      detachSpy = vi.spyOn(directive, 'detach');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should detach on document click', () => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(detachSpy).toHaveBeenCalled();
    });

    it('should detach on escape key', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(detachSpy).toHaveBeenCalled();
    });

    it('should detach on context menu', () => {
      document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

      expect(detachSpy).toHaveBeenCalled();
    });
  });
});
