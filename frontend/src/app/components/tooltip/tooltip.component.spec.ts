import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  TOOLTIP_CONTENT_TOKEN,
  TOOLTIP_CONTEXT_TOKEN,
} from '@app/directives/tooltip.directive';
import { query, queryTextContent } from '@app/utils';

import { TooltipComponent } from './tooltip.component';

// Host component to obtain a real TemplateRef instance for the template-content tests
// (required by Angular as of version 20)
@Component({
  standalone: true,
  template: `<ng-template #templateRef>Template Content</ng-template>`,
})
class TooltipHostTemplateComponent {
  @ViewChild('templateRef', { read: TemplateRef }) templateRef!: TemplateRef<unknown>;
}

// Host component with context-aware template
@Component({
  standalone: true,
  template: `
    <ng-template
      #templateRef
      let-context>
      Hello, {{ context?.name }}!
    </ng-template>
  `,
})
class TooltipHostTemplateWithContextComponent {
  @ViewChild('templateRef', { read: TemplateRef }) templateRef!: TemplateRef<unknown>;
}

describe('TooltipComponent', () => {
  let fixture: ComponentFixture<TooltipComponent>;
  let component: TooltipComponent;

  describe('with short string content', () => {
    const shortString = 'This is a tooltip message';

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TooltipComponent],
        providers: [
          {
            provide: TOOLTIP_CONTENT_TOKEN,
            useValue: shortString,
          },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(TooltipComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should receive content through dependency injection', () => {
      expect(component.tooltipContent).toBe(shortString);
    });

    it('should render string content in a div', () => {
      expect(query(fixture.debugElement, 'div')).toBeTruthy();
    });

    it('should display the string content', () => {
      expect(queryTextContent(fixture.debugElement, 'div')).toBe(shortString);
    });

    it('should not display template outlet for string content', () => {
      expect(query(fixture.debugElement, 'ng-template')).toBeFalsy();
    });
  });

  describe('with long string content', () => {
    const longString =
      'This is a very long tooltip message that should be truncated after reaching the character limit set by the truncate pipe';

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TooltipComponent],
        providers: [
          {
            provide: TOOLTIP_CONTENT_TOKEN,
            useValue: longString,
          },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(TooltipComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should truncate long string content to 80 characters (including ellipsis)', () => {
      const rendered = queryTextContent(fixture.debugElement, 'div');
      expect(rendered.length).toBe(80);
      expect(rendered.endsWith('...')).toBe(true);
    });
  });

  describe('with template content', () => {
    let templateRef: TemplateRef<unknown>;

    beforeEach(async () => {
      // First configure a module to obtain a real TemplateRef
      await TestBed.configureTestingModule({
        imports: [TooltipHostTemplateComponent],
      }).compileComponents();
      const hostFixture = TestBed.createComponent(TooltipHostTemplateComponent);
      hostFixture.detectChanges();
      templateRef = hostFixture.componentInstance.templateRef;

      // Reset and configure a fresh testing module supplying the real TemplateRef
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TooltipComponent],
        providers: [
          {
            provide: TOOLTIP_CONTENT_TOKEN,
            useValue: templateRef,
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(TooltipComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should receive content through dependency injection', () => {
      expect(component.tooltipContent).toBe(templateRef);
    });

    it('should not render div for template content', () => {
      expect(query(fixture.debugElement, 'div')).toBeFalsy();
    });

    it('should use ng-container with ngTemplateOutlet for template content', () => {
      expect(fixture.debugElement.nativeElement.querySelector('div')).toBeFalsy();
    });

    it('should pass template reference to ngTemplateOutlet', () => {
      expect(component.tooltipContent).toBe(templateRef);
    });

    it('should have null context when not provided', () => {
      expect(component.tooltipContext).toBeNull();
    });
  });

  describe('with template content and context', () => {
    let templateRef: TemplateRef<unknown>;
    const testContext = { name: 'John Doe', role: 'admin' };

    beforeEach(async () => {
      // First configure a module to obtain a real TemplateRef with context support
      await TestBed.configureTestingModule({
        imports: [TooltipHostTemplateWithContextComponent],
      }).compileComponents();
      const hostFixture = TestBed.createComponent(
        TooltipHostTemplateWithContextComponent,
      );
      hostFixture.detectChanges();
      templateRef = hostFixture.componentInstance.templateRef;

      // Reset and configure a fresh testing module supplying the real TemplateRef and context
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TooltipComponent],
        providers: [
          {
            provide: TOOLTIP_CONTENT_TOKEN,
            useValue: templateRef,
          },
          {
            provide: TOOLTIP_CONTEXT_TOKEN,
            useValue: testContext,
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(TooltipComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should receive content through dependency injection', () => {
      expect(component.tooltipContent).toBe(templateRef);
    });

    it('should receive context through dependency injection', () => {
      expect(component.tooltipContext).toEqual(testContext);
    });

    it('should render template content with context', () => {
      const rendered = fixture.debugElement.nativeElement.textContent.trim();
      expect(rendered).toBe('Hello, John Doe!');
    });

    it('should not render div for template content', () => {
      expect(query(fixture.debugElement, 'div')).toBeFalsy();
    });
  });
});
