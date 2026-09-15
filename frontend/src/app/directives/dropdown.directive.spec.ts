import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';

import { DropdownDirective } from './dropdown.directive';

@Component({
  template: `<button
    dropdown
    (isOpen)="onIsOpenChange($event)"
    style="width: 50px; height: 50px;">
    Dropdown
  </button>`,
  imports: [DropdownDirective],
})
class TestComponent {
  isOpen = false;

  onIsOpenChange(value: boolean): void {
    this.isOpen = value;
  }
}

describe('DropdownDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  let directiveElement: DebugElement;
  let directive: DropdownDirective;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent, OverlayModule],
      providers: [Overlay, provideMockStore()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    directiveElement = fixture.debugElement.query(By.directive(DropdownDirective));
    directive = directiveElement.injector.get(DropdownDirective);

    store = TestBed.inject(MockStore);
    store.overrideSelector(AuthSelectors.selectUser, null);
    store.overrideSelector(AppSelectors.selectIsDarkMode, false);
    store.overrideSelector(AppSelectors.selectIsSafeMode, true);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  describe('onClick', () => {
    it('should attach dropdown when clicked and not already open', () => {
      // @ts-expect-error Private class member
      vi.spyOn(directive, 'attach');

      directiveElement.nativeElement.click();

      // @ts-expect-error Private class member
      expect(directive.attach).toHaveBeenCalled();
      expect(component.isOpen).toBe(true);
    });

    it('should detach dropdown when clicked and already open', () => {
      // @ts-expect-error Private class member
      vi.spyOn(directive, 'detach');
      directiveElement.nativeElement.click();
      fixture.detectChanges();

      expect(component.isOpen).toBe(true);

      directiveElement.nativeElement.click();

      // @ts-expect-error Private class member
      expect(directive.detach).toHaveBeenCalled();
      expect(component.isOpen).toBe(false);
    });

    it('should toggle dropdown on multiple clicks', () => {
      expect(component.isOpen).toBe(false);

      directiveElement.nativeElement.click();
      expect(component.isOpen).toBe(true);

      directiveElement.nativeElement.click();
      expect(component.isOpen).toBe(false);

      directiveElement.nativeElement.click();
      expect(component.isOpen).toBe(true);
    });
  });

  describe('attach', () => {
    let detachSpy: MockInstance;
    let emitSpy: MockInstance;

    beforeEach(() => {
      // @ts-expect-error Private class member
      detachSpy = vi.spyOn(directive, 'detach');
      emitSpy = vi.spyOn(directive.isOpen, 'emit');

      // @ts-expect-error Private class member
      directive.attach();
    });

    it('should create overlay and attach component', () => {
      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
      // @ts-expect-error Private class member
      expect(directive.componentRef).toBeTruthy();
    });

    it('should emit isOpen event when attached', () => {
      expect(emitSpy).toHaveBeenCalledWith(true);
    });

    it('should set outline style on element', () => {
      expect(directiveElement.nativeElement.style.outline).toBe('none');
    });

    it('should subscribe to component close event', () => {
      // @ts-expect-error Private class member
      directive.componentRef!.instance.close.emit();

      expect(detachSpy).toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    let emitSpy: MockInstance;

    beforeEach(() => {
      emitSpy = vi.spyOn(directive.isOpen, 'emit');

      // @ts-expect-error Private class member
      directive.attach();
    });

    it('should detach overlay and emit isOpen false', () => {
      // @ts-expect-error Private class member
      directive.detach();

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith(false);
    });

    it('should remove outline style from element', () => {
      expect(directiveElement.nativeElement.style.outline).toBe('none');

      // @ts-expect-error Private class member
      directive.detach();

      expect(directiveElement.nativeElement.style.outline).toBe('');
    });

    it('should handle detach when overlay is not attached', () => {
      // @ts-expect-error Private class member
      expect(() => directive.detach()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('should dispose overlay on destroy', () => {
      // @ts-expect-error Private class member
      directive.attach();

      // @ts-expect-error Private class member
      const overlayDisposeSpy = vi.spyOn(directive!.overlayRef, 'dispose');
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

      // @ts-expect-error Private class member
      detachSpy = vi.spyOn(directive, 'detach');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not detach on document click when clicking inside component', () => {
      // @ts-expect-error Private class member
      const componentElement = directive!.componentRef.location.nativeElement;

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: componentElement,
        enumerable: true,
      });

      document.dispatchEvent(event);

      expect(detachSpy).not.toHaveBeenCalled();
    });

    it('should detach on document click when clicking outside component', () => {
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: document.createElement('div'),
        enumerable: true,
      });

      document.dispatchEvent(event);

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
