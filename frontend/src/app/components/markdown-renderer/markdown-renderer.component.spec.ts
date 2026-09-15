import { MarkdownComponent } from 'ngx-markdown';
import { of } from 'rxjs';

import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';

import { RoutingService } from '@app/services';

import { MarkdownRendererComponent } from './markdown-renderer.component';

@Component({
  selector: 'markdown',
  template: '',
  standalone: true,
})
class MockMarkdownComponent {
  @Input() data = '';
  @Input() disableSanitizer = false;
}

describe('MarkdownRendererComponent', () => {
  let fixture: ComponentFixture<MarkdownRendererComponent>;
  let component: MarkdownRendererComponent;

  let addAnchorIdsToHeadingsSpy: MockInstance;
  let addBlockquoteIconsSpy: MockInstance;
  let scrollToAnchorSpy: MockInstance;
  let wrapMarkdownTablesSpy: MockInstance;

  const mockMarkdownText = `
  ## Heading 1
  
  Some text here.
  
  ## Heading 2
  
  More text here.
  
  | Column 1 | Column 2 |
  |----------|----------|
  | Data 1   | Data 2   |
  
  > This is a blockquote
  `;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownRendererComponent, RouterLink, RouterModule.forRoot([])],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { fragment: of('mock-fragment') },
        },
        {
          provide: RoutingService,
          useValue: { fragment$: of('mock-fragment') },
        },
      ],
    })
      .overrideComponent(MarkdownRendererComponent, {
        remove: { imports: [MarkdownComponent] },
        add: { imports: [MockMarkdownComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MarkdownRendererComponent);
    component = fixture.componentInstance;

    // @ts-expect-error Private class member
    addAnchorIdsToHeadingsSpy = vi.spyOn(component, 'addAnchorIdsToHeadings');
    // @ts-expect-error Private class member
    addBlockquoteIconsSpy = vi.spyOn(component, 'addBlockquoteIcons');
    // @ts-expect-error Private class member
    scrollToAnchorSpy = vi.spyOn(component, 'scrollToAnchor');
    // @ts-expect-error Private class member
    wrapMarkdownTablesSpy = vi.spyOn(component, 'wrapMarkdownTables');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should set currentPath from document location (JSDOM location for this test)', () => {
      expect(component.currentPath).toBe('/');
    });

    it('should scroll to URL fragment after view init', () => {
      vi.useFakeTimers();

      component.ngAfterViewInit();

      vi.advanceTimersByTime(1);

      expect(scrollToAnchorSpy).toHaveBeenCalledWith('mock-fragment');

      vi.useRealTimers();
    });
  });

  describe('data changes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('data', mockMarkdownText);
      fixture.detectChanges();
      // Simulate lifecycle timing delay
      vi.advanceTimersByTime(1);
    });

    afterEach(() => vi.useRealTimers());

    it('should set data input', () => {
      expect(component.data).toBe(mockMarkdownText);
    });

    it('should add custom blockquote icons, wrap tables, and add anchor ids to headings', () => {
      expect(addBlockquoteIconsSpy).toHaveBeenCalledTimes(1);
      expect(wrapMarkdownTablesSpy).toHaveBeenCalledTimes(1);
      expect(addAnchorIdsToHeadingsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    it('should expose headings for table of contents', () => {
      component.headings = ['Heading 1', 'Heading 2', 'Heading 3'];
      fixture.detectChanges();
      expect(component.headings).toEqual(['Heading 1', 'Heading 2', 'Heading 3']);
    });
  });
});
