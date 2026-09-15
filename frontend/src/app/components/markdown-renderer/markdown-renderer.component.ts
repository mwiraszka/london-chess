import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { kebabCase } from 'lodash';
import { MarkdownComponent } from 'ngx-markdown';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Image } from '@app/models';
import { KebabCasePipe } from '@app/pipes';
import { RoutingService } from '@app/services';
import { isCollectionId } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-markdown-renderer',
  template: `
    <div class="table-of-contents">
      @for (heading of headings; track heading) {
        <a
          class="heading-link lcc-link"
          [fragment]="heading | kebabCase"
          [routerLink]="currentPath">
          {{ heading }}
        </a>
      }
    </div>
    <markdown
      [data]="processedData"
      [disableSanitizer]="true">
    </markdown>
  `,
  styleUrl: './markdown-renderer.component.scss',
  imports: [KebabCasePipe, MarkdownComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownRendererComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() public data?: string;
  @Input() public images: Image[] = [];
  @Input() public isWideView = false;

  public currentPath: string;
  public headings: string[] = [];
  public processedData?: string;

  private resizeObserverMap = new Map<HTMLElement, ResizeObserver>();

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private readonly elementRef: ElementRef,
    private readonly renderer: Renderer2,
    private readonly routingService: RoutingService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
    this.currentPath = this._document.location.pathname;
  }

  public ngOnChanges(changes: SimpleChanges<MarkdownRendererComponent>): void {
    if (changes.data || changes.images) {
      // Preprocess images BEFORE markdown rendering
      this.processedData = this.preprocessImages(this.data || '');

      const markdownElement = this.elementRef.nativeElement.querySelector('markdown');
      if (markdownElement) {
        this.renderer.setStyle(markdownElement, 'visibility', 'hidden');
      }

      setTimeout(() => {
        this.wrapMarkdownTables();
        this.addBlockquoteIcons();
        this.addAnchorIdsToHeadings();
        if (markdownElement) {
          this.renderer.removeStyle(markdownElement, 'visibility');
        }
        this.changeDetectorRef.markForCheck();
      });
    }

    if (changes.isWideView) {
      setTimeout(() => {
        this.updateTableStickyColumns();
        this.changeDetectorRef.markForCheck();
      });
    }
  }

  public ngAfterViewInit(): void {
    setTimeout(() => {
      // Scroll to anchor when heading link is clicked
      this.routingService.fragment$
        .pipe(untilDestroyed(this))
        .subscribe(fragment => this.scrollToAnchor(fragment));
    });
  }

  public ngOnDestroy(): void {
    this.resizeObserverMap.forEach(observer => observer.disconnect());
    this.resizeObserverMap.clear();
  }

  private preprocessImages(text: string): string {
    // Regular expression to match {{{src}}}(((width)))<<<caption>>> (width and caption optional)
    const imagePattern = /{{{([^}]+)}}}(?:\(\(\(([^)]*)\)\)\))?(?:<<<([\s\S]*?)>>>)?/g;

    return text.replace(imagePattern, (_, src, width, caption) => {
      const imageId = isCollectionId(src) ? src : src.match(/[a-f\d]{24}/)?.[0];
      const image = imageId ? this.images.find(img => img.id === imageId) : null;

      const imageUrl =
        image?.mainUrl || (isCollectionId(src) ? 'assets/fallback-image.png' : src);

      const defaultWidth = image?.mainWidth || 300;
      const parsedWidth = width ? parseInt(width.trim(), 10) : defaultWidth;
      const widthValue = Math.min(parsedWidth, 1200).toString();
      const captionValue = caption ? caption.trim() : '';

      const captionHtml = captionValue
        ? `<div class="markdown-image-caption">${captionValue}</div>`
        : '';

      return `\n\n<div class="markdown-image-container" style="max-width: ${widthValue}px;"><img src="${imageUrl}" alt="${captionValue}" onerror="this.src='assets/fallback-image.png'">${captionHtml}</div>\n\n`;
    });
  }

  private wrapMarkdownTables(): void {
    const tableElements =
      this.elementRef.nativeElement.querySelectorAll('markdown table');

    if (tableElements) {
      tableElements.forEach((tableElement: HTMLElement) => {
        if (!Array.from(tableElement?.classList ?? []).includes('lcc-table')) {
          tableElement.classList.add('lcc-table');

          const wrapperElement = this._document.createElement('div');
          wrapperElement.classList.add('lcc-table-wrapper');

          tableElement?.parentNode?.insertBefore(wrapperElement, tableElement);
          wrapperElement.appendChild(tableElement);

          this.configureStickyColumns(wrapperElement);
        }
      });
    }
  }

  private updateTableStickyColumns(): void {
    const wrappers = this.elementRef.nativeElement.querySelectorAll('.lcc-table-wrapper');

    wrappers.forEach((wrapperElement: HTMLElement) => {
      this.configureStickyColumns(wrapperElement);
    });
  }

  private configureStickyColumns(wrapperElement: HTMLElement): void {
    const tableElement = wrapperElement.querySelector('table');
    const firstHeaderCell = tableElement?.querySelector('thead th:first-child');

    const shouldFixFirstTwoColumnWidths =
      firstHeaderCell?.textContent?.trim() === '#' &&
      firstHeaderCell?.nextElementSibling?.textContent?.trim() === 'Name';
    const hasFixedFirstTwoColumnWidths = wrapperElement.classList.contains(
      'lcc-results-table-wrapper',
    );

    const shouldHaveSticky = shouldFixFirstTwoColumnWidths && !this.isWideView;
    const hasSticky = wrapperElement.classList.contains('lcc-has-sticky-columns');

    // Handle fixed column widths
    if (shouldFixFirstTwoColumnWidths && !hasFixedFirstTwoColumnWidths) {
      wrapperElement.classList.add('lcc-results-table-wrapper');

      const updateColumnWidths = () => {
        const wrapperWidth = wrapperElement.offsetWidth || 0;
        const col2Width = Math.min(220, Math.max(140, wrapperWidth - 570));
        wrapperElement.style.setProperty('--lcc-sticky-col-1-width', '52px');
        wrapperElement.style.setProperty('--lcc-sticky-col-2-width', `${col2Width}px`);
      };

      requestAnimationFrame(() => updateColumnWidths());

      const resizeObserver = new ResizeObserver(() => updateColumnWidths());
      resizeObserver.observe(wrapperElement);
      this.resizeObserverMap.set(wrapperElement, resizeObserver);
    }

    // Handle sticky behavior
    if (shouldHaveSticky === hasSticky) {
      return;
    }

    if (shouldHaveSticky) {
      wrapperElement.classList.add('lcc-has-sticky-columns');
    } else {
      wrapperElement.classList.remove('lcc-has-sticky-columns');
    }
  }

  private addBlockquoteIcons(): void {
    const blockquoteElements =
      this.elementRef.nativeElement.querySelectorAll('blockquote');

    if (blockquoteElements) {
      blockquoteElements.forEach((blockquoteElement: HTMLElement) => {
        if (!blockquoteElement.classList.contains('lcc-blockquote')) {
          blockquoteElement.classList.add('lcc-blockquote');

          const quoteIconElement = this._document.createElement('div');
          quoteIconElement.classList.add('lcc-quote-icon');
          quoteIconElement.style.backgroundImage = 'url("/assets/open-quote-icon.svg")';

          if (blockquoteElement.firstChild) {
            blockquoteElement.insertBefore(
              quoteIconElement,
              blockquoteElement.firstChild,
            );
          } else {
            blockquoteElement.appendChild(quoteIconElement);
          }

          blockquoteElement.style.position = 'relative';
        }
      });
    }
  }

  private addAnchorIdsToHeadings(): void {
    const headingElements = this.elementRef.nativeElement.querySelectorAll('markdown h2');

    const newHeadings: string[] = [];

    if (headingElements) {
      headingElements.forEach((element: HTMLElement) => {
        const heading = (element.textContent || element.innerHTML).replace(
          /(<([^>]+)>)/gi,
          '',
        );

        element.setAttribute('id', kebabCase(heading));
        newHeadings.push(heading);
      });
    }

    this.headings = newHeadings;
  }

  private scrollToAnchor(anchorId?: string | null): void {
    if (!anchorId) {
      return;
    }

    const headingElement = this._document.getElementById(anchorId);

    if (headingElement) {
      headingElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }
}
