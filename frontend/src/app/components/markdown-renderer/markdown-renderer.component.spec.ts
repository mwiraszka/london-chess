import { provideMarkdown } from 'ngx-markdown';
import { Subject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Image } from '@app/models';
import { RoutingService } from '@app/services';
import { query, queryAll } from '@app/utils';

import { MarkdownRendererComponent } from './markdown-renderer.component';

describe('MarkdownRendererComponent', () => {
  const imageId = '0123456789abcdef01234567';
  const image: Image = {
    id: imageId,
    filename: 'board.jpg',
    caption: 'A board',
    album: 'Club',
    albumCover: false,
    albumOrdinality: '1',
    mainUrl: 'https://example.com/board.jpg',
    mainWidth: 640,
    modificationInfo: {
      createdBy: 'Admin',
      createdByNumber: null,
      dateCreated: '2025-01-01T00:00:00Z',
      lastEditedBy: 'Admin',
      lastEditedByNumber: null,
      dateLastEdited: '2025-01-01T00:00:00Z',
    },
  };

  let fixture: ComponentFixture<MarkdownRendererComponent>;
  let fragment$: Subject<string | null>;

  const render = async (data: string, images: Image[] = []): Promise<void> => {
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    await vi.runOnlyPendingTimersAsync();
    fixture.detectChanges();
  };

  const rendered = <T extends HTMLElement>(selector: string): T[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  beforeEach(async () => {
    vi.useFakeTimers();
    fragment$ = new Subject<string | null>();

    await TestBed.configureTestingModule({
      imports: [MarkdownRendererComponent],
      providers: [
        provideMarkdown(),
        provideRouter([]),
        { provide: RoutingService, useValue: { fragment$ } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownRendererComponent);
    fixture.detectChanges();
    await vi.runOnlyPendingTimersAsync();
  });

  afterEach(() => fixture.destroy());

  describe('headings', () => {
    beforeEach(async () => {
      await render('## First Section\n\nText\n\n## Second *Part*\n\n<h2></h2>');
    });

    it('should list each heading as a link to its anchor', () => {
      const links = queryAll(fixture.debugElement, '.heading-link');

      expect(links.map(link => link.nativeElement.getAttribute('href'))).toEqual([
        '/#first-section',
        '/#second-part',
        '/#',
      ]);
    });

    it('should give each heading an anchor id', () => {
      const headings = rendered('markdown h2');

      expect(headings.map(heading => heading.id)).toEqual([
        'first-section',
        'second-part',
        '',
      ]);
    });

    it('should scroll to the heading named by the URL fragment', () => {
      const [heading] = rendered('#second-part');
      const scrollSpy = vi.spyOn(heading, 'scrollIntoView');

      fragment$.next('second-part');

      expect(scrollSpy).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should not scroll without a fragment or a matching heading', () => {
      const [heading] = rendered('#first-section');
      const scrollSpy = vi.spyOn(heading, 'scrollIntoView');

      fragment$.next(null);
      fragment$.next('missing-section');

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  describe('blockquotes', () => {
    it('should hide changed markdown until it has been decorated', async () => {
      await render('> A quote');

      fixture.componentRef.setInput('data', '> Another quote');
      fixture.detectChanges();
      const [markdown] = rendered('markdown');
      const hiddenBefore = markdown.style.visibility;
      await vi.runOnlyPendingTimersAsync();

      expect(hiddenBefore).toBe('hidden');
      expect(markdown.style.visibility).toBe('');
    });

    it('should open every blockquote with a quote icon, once', async () => {
      const data = '> A quote\n\n<blockquote></blockquote>';
      await render(data);

      await render(data, [image]);

      const blockquotes = rendered('blockquote');
      expect(blockquotes.map(blockquote => blockquote.className)).toEqual([
        'lcc-blockquote',
        'lcc-blockquote',
      ]);
      expect(
        blockquotes.map(
          blockquote => blockquote.querySelectorAll('.lcc-quote-icon').length,
        ),
      ).toEqual([1, 1]);
      expect(
        blockquotes.map(blockquote => blockquote.firstElementChild?.className),
      ).toEqual(['lcc-quote-icon', 'lcc-quote-icon']);
    });
  });

  describe('images', () => {
    const container = () => rendered('.markdown-image-container')[0];

    it('should render a stored image at the given width with its caption', async () => {
      await render(`{{{${imageId}}}}(((500)))<<< The board >>>`, [image]);

      expect(container().style.maxWidth).toBe('500px');
      expect(container().querySelector('img')?.getAttribute('src')).toBe(image.mainUrl);
      expect(container().querySelector('img')?.getAttribute('alt')).toBe('The board');
      expect(container().querySelector('.markdown-image-caption')?.textContent).toBe(
        'The board',
      );
    });

    it('should find a stored image by the id in a URL and use its own width', async () => {
      await render(`{{{https://example.com/images/${imageId}.jpg}}}`, [image]);

      expect(container().style.maxWidth).toBe('640px');
      expect(container().querySelector('img')?.getAttribute('src')).toBe(image.mainUrl);
      expect(container().querySelector('.markdown-image-caption')).toBeNull();
    });

    it('should fall back for an image id that is not stored', async () => {
      await render(`{{{${imageId}}}}`);

      expect(container().style.maxWidth).toBe('300px');
      expect(container().querySelector('img')?.getAttribute('src')).toBe(
        'assets/fallback-image.png',
      );
    });

    it('should use any other source as is, at no more than the widest width', async () => {
      await render('{{{https://example.com/photo.png}}}(((5000)))');

      expect(container().style.maxWidth).toBe('1200px');
      expect(container().querySelector('img')?.getAttribute('src')).toBe(
        'https://example.com/photo.png',
      );
    });
  });

  it('should render tables between the text as sortable tables', async () => {
    await render(
      'Before\n\n| Column 1 | Column 2 |\n|---|---|\n| Data 1 | Data 2 |\n\nAfter',
    );

    expect(rendered('markdown').map(markdown => markdown.textContent?.trim())).toEqual([
      'Before',
      'After',
    ]);
    expect(
      queryAll(
        query(fixture.debugElement, 'lcc-markdown-table'),
        '.ea-data-table__cell--header',
      ).map(header => header.nativeElement.textContent.trim()),
    ).toEqual(['Column 1', 'Column 2']);
  });
});
