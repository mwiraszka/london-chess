import { BaseImage, IndexedDbImageData, LccError } from '@app/models';
import { dataUrlToFile } from '@app/utils';

/**
 * Build FormData for uploading images to the backend API.
 * Converts new image metadata and IndexedDB data into FormData format,
 * and optionally includes existing images for update operations.
 *
 * @param newImagesMetadata - Array of metadata for new images to be added
 * @param indexedDbImagesData - Array of image data URLs from IndexedDB
 * @param existingImages - Optional array of existing images to be updated
 * @returns FormData object ready for API submission, or LccError if operation fails
 *
 * @example
 * const formData = buildImagesFormData(
 *   [{ id: '123', filename: 'photo.jpg', ... }],
 *   [{ id: '123', dataUrl: 'data:image/jpeg;...', filename: 'photo.jpg' }],
 *   []
 * );
 */
export function buildImagesFormData(
  newImagesMetadata: Omit<BaseImage, 'fileSize'>[],
  indexedDbImagesData: IndexedDbImageData[],
  existingImages: BaseImage[] = [],
): FormData | LccError {
  const imagesFormData = new FormData();

  for (const newImageMetadata of newImagesMetadata) {
    const indexedDbImageData = indexedDbImagesData.find(
      imageData => imageData.id === newImageMetadata.id,
    );

    if (!indexedDbImageData) {
      return {
        name: 'LCCError',
        message: `No image data found in IndexedDB for image ID ${newImageMetadata.id}`,
      };
    }

    const file = dataUrlToFile(indexedDbImageData.dataUrl, indexedDbImageData.filename);

    if (!file) {
      return {
        name: 'LCCError',
        message: `Unable to construct file object from image data URL for ${indexedDbImageData.filename}`,
      };
    }

    imagesFormData.append('files', file);
    imagesFormData.append('imageMetadata', JSON.stringify(newImageMetadata));
  }

  if (existingImages.length > 0) {
    imagesFormData.append('existingImages', JSON.stringify(existingImages));
  }

  return imagesFormData;
}
