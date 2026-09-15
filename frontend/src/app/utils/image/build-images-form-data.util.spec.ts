import { BaseImage, IndexedDbImageData } from '@app/models';

import { buildImagesFormData } from './build-images-form-data.util';

const mockDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const mockNewImageMetadata: Omit<BaseImage, 'fileSize'> = {
  id: 'new-image-1',
  filename: 'new-image.jpg',
  caption: 'New image caption',
  album: 'Test Album',
  albumCover: false,
  albumOrdinality: '1',
  modificationInfo: {
    createdBy: 'Test User',
    createdByNumber: null,
    dateCreated: '2024-01-01T00:00:00.000Z',
    lastEditedBy: 'Test User',
    lastEditedByNumber: null,
    dateLastEdited: '2024-01-01T00:00:00.000Z',
  },
};

const mockIndexedDbImageData: IndexedDbImageData = {
  id: 'new-image-1',
  filename: 'new-image.jpg',
  dataUrl: mockDataUrl,
};

const mockExistingImage: BaseImage = {
  id: 'existing-image-1',
  filename: 'existing-image.jpg',
  caption: 'Existing image caption',
  album: 'Test Album',
  albumCover: true,
  albumOrdinality: '0',
  modificationInfo: {
    createdBy: 'Test User',
    createdByNumber: null,
    dateCreated: '2023-01-01T00:00:00.000Z',
    lastEditedBy: 'Test User',
    lastEditedByNumber: null,
    dateLastEdited: '2024-01-01T00:00:00.000Z',
  },
};

describe('buildImagesFormData', () => {
  it('should return empty FormData when no images provided', () => {
    const result = buildImagesFormData([], [], []);

    expect(result).toBeInstanceOf(FormData);
    expect((result as FormData).has('files')).toBe(false);
    expect((result as FormData).has('imageMetadata')).toBe(false);
    expect((result as FormData).has('existingImages')).toBe(false);
  });

  it('should build FormData with new images', () => {
    const result = buildImagesFormData(
      [mockNewImageMetadata],
      [mockIndexedDbImageData],
      [],
    );

    expect(result).toBeInstanceOf(FormData);
    const formData = result as FormData;
    expect(formData.has('files')).toBe(true);
    expect(formData.has('imageMetadata')).toBe(true);
    expect(formData.getAll('files')).toHaveLength(1);
    expect(formData.getAll('imageMetadata')).toHaveLength(1);
  });

  it('should build FormData with existing images', () => {
    const result = buildImagesFormData([], [], [mockExistingImage]);

    expect(result).toBeInstanceOf(FormData);
    const formData = result as FormData;
    expect(formData.has('existingImages')).toBe(true);
    const existingImagesJson = formData.get('existingImages') as string;
    const existingImages = JSON.parse(existingImagesJson);
    expect(existingImages).toHaveLength(1);
    expect(existingImages[0].id).toBe('existing-image-1');
  });

  it('should build FormData with both new and existing images', () => {
    const result = buildImagesFormData(
      [mockNewImageMetadata],
      [mockIndexedDbImageData],
      [mockExistingImage],
    );

    expect(result).toBeInstanceOf(FormData);
    const formData = result as FormData;
    expect(formData.has('files')).toBe(true);
    expect(formData.has('imageMetadata')).toBe(true);
    expect(formData.has('existingImages')).toBe(true);
    expect(formData.getAll('files')).toHaveLength(1);
    expect(formData.getAll('imageMetadata')).toHaveLength(1);
  });

  it('should build FormData with multiple new images', () => {
    const secondMetadata: Omit<BaseImage, 'fileSize'> = {
      ...mockNewImageMetadata,
      id: 'new-image-2',
      filename: 'new-image-2.jpg',
    };
    const secondIndexedDbData: IndexedDbImageData = {
      ...mockIndexedDbImageData,
      id: 'new-image-2',
      filename: 'new-image-2.jpg',
    };

    const result = buildImagesFormData(
      [mockNewImageMetadata, secondMetadata],
      [mockIndexedDbImageData, secondIndexedDbData],
      [],
    );

    expect(result).toBeInstanceOf(FormData);
    const formData = result as FormData;
    expect(formData.getAll('files')).toHaveLength(2);
    expect(formData.getAll('imageMetadata')).toHaveLength(2);
  });

  it('should serialize imageMetadata correctly', () => {
    const result = buildImagesFormData(
      [mockNewImageMetadata],
      [mockIndexedDbImageData],
      [],
    );

    const formData = result as FormData;
    const metadataJson = formData.get('imageMetadata') as string;
    const metadata = JSON.parse(metadataJson);
    expect(metadata).toEqual(mockNewImageMetadata);
  });

  it('should return error when IndexedDB data is missing for new image', () => {
    const result = buildImagesFormData([mockNewImageMetadata], [], []);

    expect(result).toEqual({
      name: 'LCCError',
      message: 'No image data found in IndexedDB for image ID new-image-1',
    });
  });

  it('should return error when file construction fails', () => {
    const invalidIndexedDbData: IndexedDbImageData = {
      ...mockIndexedDbImageData,
      dataUrl: '',
    };

    const result = buildImagesFormData(
      [mockNewImageMetadata],
      [invalidIndexedDbData],
      [],
    );

    expect(result).toEqual({
      name: 'LCCError',
      message: 'Unable to construct file object from image data URL for new-image.jpg',
    });
  });

  it('should handle mismatched IDs between metadata and IndexedDB data', () => {
    const mismatchedIndexedDbData: IndexedDbImageData = {
      ...mockIndexedDbImageData,
      id: 'different-id',
    };

    const result = buildImagesFormData(
      [mockNewImageMetadata],
      [mismatchedIndexedDbData],
      [],
    );

    expect(result).toEqual({
      name: 'LCCError',
      message: 'No image data found in IndexedDB for image ID new-image-1',
    });
  });

  it('should append multiple existing images to FormData', () => {
    const secondExistingImage: BaseImage = {
      ...mockExistingImage,
      id: 'existing-image-2',
      filename: 'existing-image-2.jpg',
    };

    const result = buildImagesFormData([], [], [mockExistingImage, secondExistingImage]);

    const formData = result as FormData;
    const existingImagesJson = formData.get('existingImages') as string;
    const existingImages = JSON.parse(existingImagesJson);
    expect(existingImages).toHaveLength(2);
    expect(existingImages[0].id).toBe('existing-image-1');
    expect(existingImages[1].id).toBe('existing-image-2');
  });

  it('should not append existingImages field when array is empty', () => {
    const result = buildImagesFormData(
      [mockNewImageMetadata],
      [mockIndexedDbImageData],
      [],
    );

    const formData = result as FormData;
    expect(formData.has('existingImages')).toBe(false);
  });
});
