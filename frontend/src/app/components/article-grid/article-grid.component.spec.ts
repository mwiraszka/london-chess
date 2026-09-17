import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Article, DataPaginationOptions } from '@app/models';
import { DialogService, StoreRequestService } from '@app/services';
import { ArticlesActions } from '@app/store/articles';
import { lastOpenedDialog, query, queryAll, queryTextContent } from '@app/utils';

import { ArticleGridComponent } from './article-grid.component';

describe('ArticleGridComponent', () => {
  let fixture: ComponentFixture<ArticleGridComponent>;
  let component: ArticleGridComponent;

  let dialogService: DialogService;

  let dialogOpenSpy: MockInstance;
  let storeRequestSpy: Mock;

  const mockOptions: DataPaginationOptions<Article> = {
    page: 1,
    pageSize: 10,
    sortBy: 'modificationInfo',
    sortOrder: 'desc',
    filters: null,
    search: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlsDirective, ArticleGridComponent],
      providers: [
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleGridComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);

    fixture.componentRef.setInput('articles', MOCK_ARTICLES);
    fixture.componentRef.setInput('images', MOCK_IMAGES);
    fixture.componentRef.setInput('isAdmin', true);
    fixture.componentRef.setInput('options', mockOptions);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showSkeleton', () => {
    it('should return true when isLoading is true', () => {
      fixture.componentRef.setInput('isLoading', true);

      expect(component.showSkeleton).toBe(true);
    });

    it('should return false when isLoading is false', () => {
      fixture.componentRef.setInput('isLoading', false);

      expect(component.showSkeleton).toBe(false);
    });

    it('should return false when isLoading is undefined', () => {
      expect(component.showSkeleton).toBe(false);
    });
  });

  describe('displayItems', () => {
    it('should return visibleRows when not loading', () => {
      fixture.componentRef.setInput('isLoading', false);

      expect(component.displayItems).toBe(component.visibleRows);
    });

    it('should return 10 skeleton rows when loading on home page', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('isHomePage', true);

      expect(component.displayItems).toHaveLength(10);
    });

    it('should return pageSize skeleton rows when loading with specific pageSize', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', { ...mockOptions, pageSize: 25 });

      expect(component.displayItems).toHaveLength(25);
    });

    it('should return 100 skeleton rows when loading with pageSize -1', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', { ...mockOptions, pageSize: -1 });

      expect(component.displayItems).toHaveLength(100);
    });

    it('should return 100 skeleton rows when loading with no options', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', undefined);

      expect(component.displayItems).toHaveLength(100);
    });
  });

  describe('visibleRows', () => {
    it('should map articles to their banner image when available', () => {
      const matchingImage = MOCK_IMAGES.find(
        image => image.id === MOCK_ARTICLES[0].bannerImageId,
      );

      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.componentRef.setInput('images', MOCK_IMAGES);
      fixture.detectChanges();

      expect(component.visibleRows).toHaveLength(1);
      expect(component.visibleRows[0].article).toBe(MOCK_ARTICLES[0]);
      expect(component.visibleRows[0].bannerImage).toEqual(matchingImage ?? null);
    });

    it('should set bannerImage to null when no matching image exists', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.componentRef.setInput('images', []);
      fixture.detectChanges();

      expect(component.visibleRows).toHaveLength(1);
      expect(component.visibleRows[0].bannerImage).toBeNull();
    });
  });

  describe('getAdminControlsConfig', () => {
    it('should return correct configuration for bookmarked article', () => {
      const article = MOCK_ARTICLES[0];
      const config = component.getAdminControlsConfig(article);

      expect(config.bookmarked).toBe(true);
      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['article', 'edit', article.id]);
      expect(config.itemName).toBe(article.title);
      expect(config.bookmarkCb).toBeDefined();
      expect(config.deleteCb).toBeDefined();
    });

    it('should return correct configuration for non-bookmarked article', () => {
      const article = MOCK_ARTICLES[2];
      const config = component.getAdminControlsConfig(article);

      expect(config.bookmarked).toBe(false);
    });
  });

  describe('onDeleteArticle', () => {
    const mockArticle = MOCK_ARTICLES[0];

    it('should open confirmation dialog with correct parameters', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteArticle(mockArticle);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Delete ${mockArticle.title}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
        isModal: true,
      });
    });

    it('should delete the article from the confirmation dialog', async () => {
      await component.onDeleteArticle(mockArticle);
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(storeRequestSpy).toHaveBeenCalledWith(
        ArticlesActions.deleteArticleRequested({ article: mockArticle }),
        [ArticlesActions.deleteArticleSucceeded, ArticlesActions.deleteArticleFailed],
      );
    });

    it('should not delete anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteArticle(mockArticle);

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('onBookmarkArticle', () => {
    describe('for a bookmarked article', () => {
      const bookmarkedArticle = MOCK_ARTICLES[0];

      it('should open dialog with remove bookmark message', async () => {
        dialogOpenSpy.mockResolvedValue('cancel');
        await component.onBookmarkArticle(bookmarkedArticle);

        expect(dialogOpenSpy).toHaveBeenCalledWith({
          componentType: BasicDialogComponent,
          inputs: {
            dialog: expect.objectContaining({
              title: 'Confirm',
              body: `Remove bookmark from article ${bookmarkedArticle.title}?`,
              confirmButtonText: 'Remove',
              confirmButtonType: 'primary',
            }),
          },
          isModal: true,
        });
      });

      it('should remove the bookmark from the confirmation dialog', async () => {
        await component.onBookmarkArticle(bookmarkedArticle);
        await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

        expect(storeRequestSpy).toHaveBeenCalledWith(
          ArticlesActions.updateArticleBookmarkRequested({
            articleId: bookmarkedArticle.id,
            bookmark: false,
          }),
          [ArticlesActions.updateArticleSucceeded, ArticlesActions.updateArticleFailed],
        );
      });
    });

    describe('for a non-bookmarked article', () => {
      const nonBookmarkedArticle = MOCK_ARTICLES[2];

      it('should open dialog with add bookmark message', async () => {
        dialogOpenSpy.mockResolvedValue('cancel');

        await component.onBookmarkArticle(nonBookmarkedArticle);

        expect(dialogOpenSpy).toHaveBeenCalledWith({
          componentType: BasicDialogComponent,
          inputs: {
            dialog: expect.objectContaining({
              title: 'Confirm',
              body: `Bookmark ${nonBookmarkedArticle.title}? This will make the article show up first in the list of articles.`,
              confirmButtonText: 'Bookmark',
              confirmButtonType: 'primary',
            }),
          },
          isModal: true,
        });
      });

      it('should bookmark the article from the confirmation dialog', async () => {
        await component.onBookmarkArticle(nonBookmarkedArticle);
        await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

        expect(storeRequestSpy).toHaveBeenCalledWith(
          ArticlesActions.updateArticleBookmarkRequested({
            articleId: nonBookmarkedArticle.id,
            bookmark: true,
          }),
          [ArticlesActions.updateArticleSucceeded, ArticlesActions.updateArticleFailed],
        );
      });
    });
  });

  describe('template rendering', () => {
    it('should render correct number of article cards', () => {
      fixture.componentRef.setInput('articles', MOCK_ARTICLES.slice(0, 3));
      fixture.detectChanges();

      expect(queryAll(fixture.debugElement, '.article').length).toBe(3);
    });

    it('should display article titles', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.article-title')).toBe(
        MOCK_ARTICLES[0].title,
      );
    });

    it('should display formatted dates', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.article-creation-date')).toContain(
        'Jan 1, 2025',
      );
    });

    it('should show admin controls when isAdmin is true', () => {
      fixture.componentRef.setInput('isAdmin', true);
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.article')).toBeTruthy();

      const adminConfig = component.getAdminControlsConfig(MOCK_ARTICLES[0]);
      expect(adminConfig.editPath).toBeTruthy();
    });

    it('should not show admin controls when isAdmin is false', () => {
      fixture.componentRef.setInput('isAdmin', false);
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.article')).toBeTruthy();
      expect(component.isAdmin).toBe(false);
    });

    it('should show bookmark icon for bookmarked articles', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.bookmark-icon')).toBeTruthy();
    });

    it('should not show bookmark icon for non-bookmarked articles', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[2]]);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.bookmark-icon')).toBeFalsy();
    });

    it('should apply correct router link to article cards', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.article').nativeElement.getAttribute('href'),
      ).toBe('/article/view/' + MOCK_ARTICLES[0].id);
    });

    it('should display banner images with correct source', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.componentRef.setInput('images', [MOCK_IMAGES[0]]);
      component.ngOnChanges({
        images: {
          currentValue: [MOCK_IMAGES[0]],
          previousValue: [],
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      fixture.detectChanges();

      const bannerImg = query(fixture.debugElement, '.image-container img');
      expect(bannerImg.attributes['src']).toBe(MOCK_IMAGES[0].thumbnailUrl);
    });

    it('should strip markdown from article body preview', () => {
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[2]]);
      fixture.detectChanges();

      const bodyPreview = queryTextContent(fixture.debugElement, '.article-preview');
      expect(bodyPreview).toContain('An article header');
      expect(bodyPreview).toContain('And not much text underneath it.');
      expect(bodyPreview).not.toContain('#');
    });

    it('should display formatted player list for blitz result table articles', () => {
      const resultTableArticle: Article = {
        ...MOCK_ARTICLES[3],
        title: 'Blitz Saturday Tournament',
        body:
          '## Open\n<br>\n\n| # | Name | Rating | Round 1 | Points |\n|--:|--|--|--|--:|\n' +
          '|1\t|Fry, Philip\t|2195\t|W6 (w)\t|1.0|\n' +
          '|2\t|Turanga, Leela\t|1954\t|W20 (w)\t|1.0|\n' +
          '|3\t|Rodriguez, Bender\t|1835\t|W13 (w)\t|1.0|\n' +
          '|4\t|Farnsworth, Hubert\t|2056\t|L8 (b)\t|0.0|\n' +
          '|5\t|Wong, Amy\t|1431\t|W15 (w)\t|1.0|\n' +
          '|6\t|Kroker, Kif\t|1827\t|L1 (b)\t|0.0|',
      };
      fixture.componentRef.setInput('articles', [resultTableArticle]);
      fixture.detectChanges();

      const bodyPreview = queryTextContent(fixture.debugElement, '.article-preview');
      expect(bodyPreview).toContain('1. Fry, P.');
      expect(bodyPreview).toContain('\u2013 1.0');
      expect(bodyPreview).not.toContain('Round');
    });

    describe('when loading', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('isLoading', true);
        fixture.componentRef.setInput('options', { ...mockOptions, pageSize: 3 });
        fixture.detectChanges();
      });

      it('should render skeleton cards with placeholder elements', () => {
        const skeletonCards = queryAll(fixture.debugElement, '.article.skeleton');

        expect(skeletonCards.length).toBe(3);
      });

      it('should render image placeholders instead of real images', () => {
        expect(
          query(fixture.debugElement, '.image-container.skeleton-image'),
        ).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-image')).toBeFalsy();
      });

      it('should render title placeholders instead of real titles', () => {
        expect(
          query(fixture.debugElement, '.article-title-wrapper ea-skeleton'),
        ).toBeTruthy();
        expect(query(fixture.debugElement, '.article-title')).toBeFalsy();
      });

      it('should not render bookmark icons', () => {
        expect(query(fixture.debugElement, '.bookmark-icon')).toBeFalsy();
      });

      it('should not attach routerLink to skeleton cards', () => {
        const card = query(fixture.debugElement, '.article');

        expect(card.nativeElement.getAttribute('href')).toBeNull();
      });
    });

    it('should apply search highlighting when search term is present', () => {
      fixture.componentRef.setInput('options', { ...mockOptions, search: 'blitz' });
      fixture.componentRef.setInput('articles', [MOCK_ARTICLES[0]]);
      fixture.detectChanges();

      const highlightedTitle = queryTextContent(
        fixture.debugElement,
        '.article-title mark',
      );
      expect(highlightedTitle).toContain('Blitz');
    });
  });
});
