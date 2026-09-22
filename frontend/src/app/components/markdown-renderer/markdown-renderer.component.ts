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
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { MarkdownTableComponent } from '@app/components/markdown-table/markdown-table.component';
import { Image } from '@app/models';
import { KebabCasePipe } from '@app/pipes';
import { RoutingService } from '@app/services';
import { MarkdownSegment, isCollectionId, splitMarkdownTables } from '@app/utils';

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
    @for (segment of segments; track $index) {
      @if (segment.kind === 'table') {
        <lcc-markdown-table [table]="segment.table" />
      } @else {
        <markdown
          [data]="segment.text"
          [disableSanitizer]="true">
        </markdown>
      }
    }
  `,
  styleUrl: './markdown-renderer.component.scss',
  imports: [KebabCasePipe, MarkdownComponent, MarkdownTableComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownRendererComponent implements AfterViewInit, OnChanges {
  @Input() public data?: string;
  @Input() public images: Image[] = [];

  public currentPath: string;
  public headings: string[] = [];
  // The text between the tables, and the tables, in order
  public segments: MarkdownSegment[] = [];

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
      this.segments = splitMarkdownTables(this.preprocessImages(this.data || ''));

      const markdownElements: HTMLElement[] = Array.from(
        this.elementRef.nativeElement.querySelectorAll('markdown'),
      );
      markdownElements.forEach(element =>
        this.renderer.setStyle(element, 'visibility', 'hidden'),
      );

      setTimeout(() => {
        this.addBlockquoteIcons();
        this.addAnchorIdsToHeadings();
        markdownElements.forEach(element =>
          this.renderer.removeStyle(element, 'visibility'),
        );
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
