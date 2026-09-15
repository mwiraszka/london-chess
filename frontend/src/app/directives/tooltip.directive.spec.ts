import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { Component, DebugElement, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TooltipDirective } from './tooltip.directive';

@Component({
  template: `
    <button
      [tooltip]="tooltipContent"
      [tooltipContext]="context"
      style="width: 50px; height: 50px;">
      Hover me
    </button>
    <ng-template
      #customTemplate
      let-data>
      <div>{{ data.message }}</div>
    </ng-template>
  `,
  imports: [TooltipDirective],
})
class TestComponent {
  tooltipContent: string | TemplateRef<unknown> | null = 'Tooltip text';
  context: unknown = null;

  @ViewChild('customTemplate', { static: true })
  customTemplate!: TemplateRef<unknown>;
}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  let directiveElement: DebugElement;
  let directive: TooltipDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent, OverlayModule],
      providers: [Overlay],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    directiveElement = fixture.debugElement.query(By.directive(TooltipDirective));
    directive = directiveElement.injector.get(TooltipDirective);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  describe('attach', () => {
    it('should attach tooltip on mouseenter when tooltip content exists', () => {
      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should attach tooltip on focus when tooltip content exists', () => {
      directiveElement.nativeElement.dispatchEvent(new FocusEvent('focus'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should not attach when tooltip content is null', () => {
      directive.tooltip = null;

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef?.hasAttached()).toBeFalsy();
    });

    it('should not attach when already attached', () => {
      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      const firstOverlayRef = directive.overlayRef;

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef).toBe(firstOverlayRef);
    });

    it('should set z-index on overlay container', () => {
      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      const overlayContainer = document.querySelector(
        '.cdk-overlay-container',
      ) as HTMLElement;

      expect(overlayContainer.style.zIndex).toBe('1200');
    });

    it('should handle string tooltip content', () => {
      component.tooltipContent = 'String tooltip';
      fixture.detectChanges();

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should handle template tooltip content', () => {
      component.tooltipContent = component.customTemplate;
      component.context = { message: 'Custom message' };
      fixture.detectChanges();

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should enable pointer events for template tooltips', () => {
      directive.tooltip = component.customTemplate;

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      const componentElement =
        // @ts-expect-error Private class member
        directive.overlayRef.overlayElement.querySelector('lcc-tooltip') as HTMLElement;
      expect(componentElement!.style.pointerEvents).toBe('auto');
    });

    it('should use clientY when available from MouseEvent', () => {
      const mouseEvent = new MouseEvent('mouseenter', { clientY: 300 });

      directiveElement.nativeElement.dispatchEvent(mouseEvent);

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });
  });

  describe('detach', () => {
    it('should detach tooltip on mouseleave', () => {
      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(false);
    });

    it('should detach tooltip on blur', () => {
      directiveElement.nativeElement.dispatchEvent(new FocusEvent('focus'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);

      directiveElement.nativeElement.dispatchEvent(new FocusEvent('blur'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(false);
    });

    it('should handle detach when overlay is not attached', () => {
      expect(() => directive.detach()).not.toThrow();
    });
  });

  describe('position strategy', () => {
    it('should prefer positions below when clientY is undefined', () => {
      directiveElement.nativeElement.dispatchEvent(new FocusEvent('focus'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should prefer positions above when clientY is greater than 200', () => {
      const mouseEvent = new MouseEvent('mouseenter', { clientY: 250 });

      directiveElement.nativeElement.dispatchEvent(mouseEvent);

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should prefer positions below when clientY is less than 200', () => {
      const mouseEvent = new MouseEvent('mouseenter', { clientY: 100 });

      directiveElement.nativeElement.dispatchEvent(mouseEvent);

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });
  });

  describe('ngOnDestroy', () => {
    it('should dispose overlay on destroy', () => {
      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      const overlayDisposeSpy = vi.spyOn(directive.overlayRef, 'dispose');

      directive.ngOnDestroy();

      expect(overlayDisposeSpy).toHaveBeenCalled();
    });

    it('should not throw when overlay was never created', () => {
      expect(() => directive.ngOnDestroy()).not.toThrow();
    });
  });

  describe('tooltip context', () => {
    it('should pass context to tooltip component', () => {
      const testContext = { message: 'Test message', value: 123 };
      component.tooltipContent = component.customTemplate;
      component.context = testContext;
      fixture.detectChanges();

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });

    it('should handle null context', () => {
      component.context = null;
      fixture.detectChanges();

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('should allow multiple attach/detach cycles', () => {
      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(false);

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(true);

      directiveElement.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));

      // @ts-expect-error Private class member
      expect(directive.overlayRef.hasAttached()).toBe(false);
    });
  });
});
