import { BaseImage, LccError, NewImageFile } from '@app/models';
import { dataUrlToFile } from '@app/utils';

/**
 * Build FormData for uploading images to the backend API.
 * Converts new image metadata and the picked files into FormData format,
 * and optionally includes existing images for update operations.
 *
 * @param newImagesMetadata - Array of metadata for new images to be added
 * @param newImageFiles - Array of the picked files as data URLs
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
  newImageFiles: NewImageFile[],
  existingImages: BaseImage[] = [],
): FormData | LccError {
  const imagesFormData = new FormData();

  for (const newImageMetadata of newImagesMetadata) {
    const newImageFile = newImageFiles.find(
      imageFile => imageFile.id === newImageMetadata.id,
    );

    if (!newImageFile) {
      return {
        name: 'LCCError',
        message: `No image file found for image ID ${newImageMetadata.id}`,
      };
    }

    const file = dataUrlToFile(newImageFile.dataUrl, newImageFile.filename);

    if (!file) {
      return {
        name: 'LCCError',
        message: `Unable to construct file object from image data URL for ${newImageFile.filename}`,
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
