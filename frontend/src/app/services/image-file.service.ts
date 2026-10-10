import { compact } from 'lodash-es';

import { Injectable } from '@angular/core';

import { Id, LccError, NewImageFile, Url } from '@app/models';
import { dataUrlToFile, formatBytes, isLccError } from '@app/utils';

// Each tab keeps its own picked files, so they never reach another tab's drafts and go
// with the tab
@Injectable({
  providedIn: 'root',
})
export class ImageFileService {
  private readonly files = new Map<Id, NewImageFile>();

  public async storeImageFile(id: Id, file: File): Promise<NewImageFile | LccError> {
    const fileProcessResult = await this.processFile(file);

    if (isLccError(fileProcessResult)) {
      return fileProcessResult;
    }

    const imageFile = { id, ...fileProcessResult };
    this.files.set(id, imageFile);
    return imageFile;
  }

  public getImage(id: Id): NewImageFile | null {
    return this.files.get(id) ?? null;
  }

  public getImages(ids: Id[]): NewImageFile[] {
    return compact(ids.map(id => this.files.get(id)));
  }

  public deleteImages(ids: Id[]): void {
    ids.forEach(id => this.files.delete(id));
  }

  private processFile(
    file: File,
  ): Promise<{ dataUrl: Url; filename: string } | LccError> {
    return new Promise(resolve => {
      if (
        !['image/png', 'image/jpeg', 'image/jpg', 'image/gif'].includes(
          file.type.toLowerCase(),
        )
      ) {
        resolve({
          name: 'LCCError',
          message: `${file.type} is currently unsupported. Please try uploading ${file.name} again as PNG, JPEG, or GIF.`,
        });
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as Url;

        const sanitizedFilename =
          file.name
            .substring(0, file.name.lastIndexOf('.'))
            .replaceAll(/[^a-zA-Z0-9-_]/g, '') +
          file.name.substring(file.name.lastIndexOf('.'));

        const processedFile = dataUrlToFile(dataUrl, sanitizedFilename);

        if (!processedFile) {
          resolve({
            name: 'LCCError',
            message: 'Unable to load image file',
          });
        } else if (processedFile.size > 2_621_440) {
          resolve({
            name: 'LCCError',
            message: `Image is too large (${formatBytes(processedFile.size)}). Please reduce it to below 2.5 MB.`,
          });
        } else {
          resolve({ dataUrl, filename: processedFile.name });
        }
      };

      reader.onerror = () => {
        resolve({
          name: 'LCCError',
          message: 'Unable to process image file',
        });
      };

      reader.readAsDataURL(file);
    });
  }
}
