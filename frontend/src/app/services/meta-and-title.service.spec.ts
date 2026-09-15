import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';

import { MetaAndTitleService } from './meta-and-title.service';

describe('MetaAndTitleService', () => {
  let service: MetaAndTitleService;
  let metaService: Meta;
  let titleService: Title;

  beforeEach(() => {
    const mockMeta: Partial<Meta> = {
      updateTag: vi.fn(),
    };

    const mockTitle: Partial<Title> = {
      setTitle: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MetaAndTitleService,
        { provide: Meta, useValue: mockMeta },
        { provide: Title, useValue: mockTitle },
      ],
    });

    service = TestBed.inject(MetaAndTitleService);
    metaService = TestBed.inject(Meta);
    titleService = TestBed.inject(Title);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateTitle', () => {
    it('should append " | LCC" to non-base titles', () => {
      service.updateTitle('About Us');

      expect(titleService.setTitle).toHaveBeenCalledWith('About Us | LCC');
    });

    it('should not append suffix to base title', () => {
      service.updateTitle('London Chess Club');

      expect(titleService.setTitle).toHaveBeenCalledWith('London Chess Club');
    });

    it('should handle titles with special characters', () => {
      service.updateTitle("Chess Tournament: King's Gambit");

      expect(titleService.setTitle).toHaveBeenCalledWith(
        "Chess Tournament: King's Gambit | LCC",
      );
    });
  });

  describe('updateDescription', () => {
    it('should update both og:description and description meta tags', () => {
      const description = 'Welcome to the London Chess Club website';

      service.updateDescription(description);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:description',
        content: description,
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'description',
        content: description,
      });
      expect(metaService.updateTag).toHaveBeenCalledTimes(2);
    });

    it('should handle long descriptions', () => {
      const longDescription = 'Lorem ipsum '.repeat(50);

      service.updateDescription(longDescription);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:description',
        content: longDescription,
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'description',
        content: longDescription,
      });
      expect(metaService.updateTag).toHaveBeenCalledTimes(2);
    });
  });
});
