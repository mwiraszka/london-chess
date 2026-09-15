import { TestBed } from '@angular/core/testing';

import { ImageFileService } from './image-file.service';

describe('ImageFileService', () => {
  let service: ImageFileService;

  beforeEach(() => {
    const mockIndexedDB = {
      open: vi.fn().mockReturnValue({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: null,
      }),
    };

    Object.defineProperty(window, 'indexedDB', {
      writable: true,
      value: mockIndexedDB,
    });

    TestBed.configureTestingModule({
      providers: [ImageFileService],
    });

    service = TestBed.inject(ImageFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('file validation', () => {
    it('should reject BMP files', async () => {
      const file = new File(['test'], 'test.bmp', { type: 'image/bmp' });

      const result = await service.storeImageFile('test-id', file);

      expect(result).toEqual({
        name: 'LCCError',
        message: expect.stringContaining('unsupported'),
      });
    });

    it('should reject WEBP files', async () => {
      const file = new File(['test'], 'test.webp', { type: 'image/webp' });

      const result = await service.storeImageFile('test-id', file);

      expect(result).toEqual({
        name: 'LCCError',
        message: expect.stringContaining('unsupported'),
      });
    });

    it('should mention supported formats in error message', async () => {
      const file = new File(['test'], 'test.bmp', { type: 'image/bmp' });

      const result = await service.storeImageFile('test-id', file);

      expect(result).toEqual({
        name: 'LCCError',
        message: expect.stringMatching(/PNG.*JPEG.*GIF/i),
      });
    });
  });
});
