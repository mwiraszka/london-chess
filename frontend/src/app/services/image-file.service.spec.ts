import { TestBed } from '@angular/core/testing';

import { LccError, NewImageFile } from '@app/models';

import { ImageFileService } from './image-file.service';

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

function pngFile(name = 'photo.png', size?: number): File {
  const content = size
    ? new Uint8Array(size)
    : Uint8Array.from(atob('iVBORw0KGgo='), c => c.charCodeAt(0));
  return new File([content], name, { type: 'image/png' });
}

function lccError(result: NewImageFile | LccError): LccError {
  expect(result).toEqual(expect.objectContaining({ name: 'LCCError' }));
  return result as LccError;
}

describe('ImageFileService', () => {
  let service: ImageFileService;

  beforeEach(() => {
    service = TestBed.inject(ImageFileService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('storeImageFile', () => {
    it('should store a supported image under a sanitized filename', async () => {
      const result = await service.storeImageFile('image-1', pngFile('my photo!.png'));

      expect(result).toEqual({
        id: 'image-1',
        filename: 'myphoto.png',
        dataUrl: PNG_DATA_URL,
      });
      expect(service.getImage('image-1')).toEqual(result);
    });

    it.each(['image/bmp', 'image/webp'])('should reject %s files', async type => {
      const result = await service.storeImageFile(
        'image-1',
        new File(['test'], 'test.img', { type }),
      );

      expect(lccError(result).message).toContain(type);
      expect(service.getImage('image-1')).toBeNull();
    });

    it('should reject an image larger than 2.5 MB', async () => {
      const result = await service.storeImageFile(
        'image-1',
        pngFile('big.png', 2_700_000),
      );

      lccError(result);
      expect(service.getImage('image-1')).toBeNull();
    });

    it('should reject a file that cannot be converted', async () => {
      const result = await service.storeImageFile('image-1', pngFile(''));

      lccError(result);
    });

    it('should reject a file that cannot be read', async () => {
      class FailingFileReader {
        public result: string | null = null;
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;

        public readAsDataURL(): void {
          queueMicrotask(() => this.onerror?.());
        }
      }
      vi.stubGlobal('FileReader', FailingFileReader);

      const result = await service.storeImageFile('image-1', pngFile());

      lccError(result);
    });

    it('should replace the image stored under the same id', async () => {
      await service.storeImageFile('image-1', pngFile('first.png'));

      await service.storeImageFile('image-1', pngFile('second.png'));

      expect(service.getImages(['image-1'])).toEqual([
        { id: 'image-1', filename: 'second.png', dataUrl: PNG_DATA_URL },
      ]);
    });
  });

  describe('getImages', () => {
    it('should return only the stored images asked for', async () => {
      await service.storeImageFile('image-1', pngFile('one.png'));
      await service.storeImageFile('image-2', pngFile('two.png'));
      await service.storeImageFile('image-3', pngFile('three.png'));

      const result = service.getImages(['image-1', 'image-3', 'image-4']);

      expect(result).toEqual([
        { id: 'image-1', filename: 'one.png', dataUrl: PNG_DATA_URL },
        { id: 'image-3', filename: 'three.png', dataUrl: PNG_DATA_URL },
      ]);
    });
  });

  describe('deleteImages', () => {
    it('should remove only the given images', async () => {
      await service.storeImageFile('image-1', pngFile());
      await service.storeImageFile('image-2', pngFile());
      await service.storeImageFile('image-3', pngFile());

      service.deleteImages(['image-1', 'image-3']);

      expect(service.getImages(['image-1', 'image-2', 'image-3'])).toEqual([
        { id: 'image-2', filename: 'photo.png', dataUrl: PNG_DATA_URL },
      ]);
    });
  });
});
