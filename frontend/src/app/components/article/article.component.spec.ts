import { provideMarkdown } from 'ngx-markdown';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { ApiService } from '@app/services';
import { query, queryTextContent } from '@app/utils';

import { ArticleComponent } from './article.component';

describe('ArticleComponent', () => {
  let fixture: ComponentFixture<ArticleComponent>;

  beforeEach(async () => {
    const mockApiService: Pick<ApiService, 'get'> = {
      get: <T>() => Promise.resolve([] as T),
    };

    await TestBed.configureTestingModule({
      imports: [ArticleComponent],
      providers: [
        provideMarkdown(),
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleComponent);

    fixture.componentRef.setInput('article', MOCK_ARTICLES[2]);
    fixture.componentRef.setInput('bannerImage', null);
    fixture.detectChanges();
  });

  describe('template rendering', () => {
    it('should render all article container and content elements, and the Markdown Renderer component', () => {
      const containerSelectors = [
        '.banner-image-container',
        '.modification-info-container',
        '.markdown-container',
      ];

      const contentSelectors = [
        'img',
        '.title',
        '.author-name .member-link > span',
        '.date-created',
        '.updated',
        '.editor-name .member-link > span',
        '.date-last-edited',
        'lcc-markdown-renderer',
      ];

      [...containerSelectors, ...contentSelectors].forEach(selector => {
        expect(query(fixture.debugElement, selector)).toBeTruthy();
      });
    });

    it('should truncate article title to 120 characters', () => {
      expect(queryTextContent(fixture.debugElement, '.title')).toHaveLength(120);
    });

    it("should include the article author's and editor's names", () => {
      expect(
        queryTextContent(fixture.debugElement, '.author-name .member-link > span'),
      ).toBe(MOCK_ARTICLES[2].modificationInfo.createdBy);

      expect(
        queryTextContent(fixture.debugElement, '.editor-name .member-link > span'),
      ).toBe(MOCK_ARTICLES[2].modificationInfo.lastEditedBy);
    });

    it('should format dates correctly', () => {
      expect(queryTextContent(fixture.debugElement, '.date-created')).toBe(
        'Wed, Jan 1, 2025, 12:00 PM',
      );
      expect(queryTextContent(fixture.debugElement, '.date-last-edited')).toBe(
        'Thu, Jan 2, 2025, 10:00 AM',
      );
    });

    describe('article created and edited on the same day', () => {
      it('should display article creation info but not last edit info', () => {
        fixture.componentRef.setInput('article', MOCK_ARTICLES[4]);
        fixture.detectChanges();

        expect(queryTextContent(fixture.debugElement, '.date-created')).toBe(
          'Thu, Jan 2, 2025, 12:00 PM',
        );
        expect(query(fixture.debugElement, '.date-last-edited')).toBeFalsy();
      });
    });

    describe('banner image', () => {
      it('should use the banner image as the source when bannerImage is defined', () => {
        fixture.componentRef.setInput('bannerImage', MOCK_IMAGES[0]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'img').attributes['src']).toBe(
          MOCK_IMAGES[0].thumbnailUrl,
        );
      });

      it('should show the fallback image with shimmer overlay when bannerImage is null', () => {
        fixture.componentRef.setInput('bannerImage', null);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'img').attributes['src']).toBe(
          'assets/fallback-image.png',
        );
        expect(query(fixture.debugElement, '.shimmer-overlay')).toBeTruthy();
      });
    });
  });

  it('should render the article body with its images', () => {
    fixture.componentRef.setInput('bodyImages', [MOCK_IMAGES[1]]);
    fixture.detectChanges();

    const renderer = query(
      fixture.debugElement,
      'lcc-markdown-renderer',
    ).componentInstance;
    expect(renderer.data()).toBe(MOCK_ARTICLES[2].body);
    expect(renderer.images()).toEqual([MOCK_IMAGES[1]]);
  });
});
