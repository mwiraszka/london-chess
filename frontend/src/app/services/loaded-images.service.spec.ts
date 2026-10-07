import { TestBed } from '@angular/core/testing';

import { LoadedImagesService } from './loaded-images.service';

describe('LoadedImagesService', () => {
  it('should remember the images that have loaded', () => {
    const loadedImages = TestBed.inject(LoadedImagesService);

    loadedImages.add('https://example.com/a.jpg');

    expect(loadedImages.has('https://example.com/a.jpg')).toBe(true);
    expect(loadedImages.has('https://example.com/b.jpg')).toBe(false);
  });
});
