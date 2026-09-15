import { Injectable } from '@angular/core';

import {
  IMAGES_DB_NAME,
  IMAGES_DB_STORE,
  IMAGES_DB_VERSION,
} from '@app/constants/images';
import { Id, IndexedDbImageData, LccError, Url } from '@app/models';
import { dataUrlToFile, formatBytes, isLccError } from '@app/utils';

@Injectable({
  providedIn: 'root',
})
export class ImageFileService {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDb();
  }

  public async storeImageFile(
    id: Id,
    file: File,
    clearAllOthers = false,
  ): Promise<IndexedDbImageData | LccError> {
    const fileProcessResult = await this.processFile(file);

    if (isLccError(fileProcessResult)) {
      return fileProcessResult;
    }

    if (clearAllOthers) {
      const clearResult = await this.clearAllImages();

      if (isLccError(clearResult)) {
        return clearResult;
      }
    }

    const { dataUrl, filename } = fileProcessResult;

    try {
      const db = await this.getDbConnection();

      return new Promise<IndexedDbImageData | LccError>(resolve => {
        const transaction = db.transaction([IMAGES_DB_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_DB_STORE);

        const request = store.put({ id, filename, dataUrl });

        request.onsuccess = () => {
          resolve({ id, filename, dataUrl });
        };

        request.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error storing image file in IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };

        transaction.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in transaction when storing image file in IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };
      });
    } catch (error) {
      return {
        name: 'LCCError',
        message: `Error storing image file in IndexedDB: ${error}`,
      };
    }
  }

  public async getImage(id: Id): Promise<IndexedDbImageData | LccError> {
    try {
      const db = await this.getDbConnection();

      return new Promise<IndexedDbImageData | LccError>(resolve => {
        const transaction = db.transaction([IMAGES_DB_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_DB_STORE);

        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result as IndexedDbImageData);
        };

        request.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in cursor request when retrieving image ${id} from IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };

        transaction.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in transaction when retrieving image ${id} from IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };
      });
    } catch (error) {
      return {
        name: 'LCCError',
        message: `Error retrieving image ${id} from IndexedDB: ${error}`,
      };
    }
  }

  public async getAllImages(): Promise<IndexedDbImageData[] | LccError> {
    try {
      const db = await this.getDbConnection();

      return new Promise<IndexedDbImageData[] | LccError>(resolve => {
        const transaction = db.transaction([IMAGES_DB_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_DB_STORE);

        const request = store.openCursor();

        const images: IndexedDbImageData[] = [];

        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            images.push({
              id: cursor.value.id,
              filename: cursor.value.filename,
              dataUrl: cursor.value.dataUrl,
            });
            cursor.continue();
          } else {
            resolve(images);
          }
        };

        request.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in IndexedDB cursor request:
              ${(event.target as IDBRequest).error}`,
          });
        };

        transaction.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in transaction when retrieving images from IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };
      });
    } catch (error) {
      return {
        name: 'LCCError',
        message: `Error retrieving images from IndexedDB: ${error}`,
      };
    }
  }

  public async deleteImage(id: Id): Promise<'success' | LccError> {
    try {
      const db = await this.getDbConnection();

      return new Promise<'success' | LccError>(resolve => {
        const transaction = db.transaction([IMAGES_DB_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_DB_STORE);

        const request = store.delete(id);

        request.onsuccess = () => resolve('success');
        request.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in IndexedDB delete request:
              ${(event.target as IDBRequest).error}`,
          });
        };

        transaction.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in transaction when deleting image from IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };
      });
    } catch (error) {
      return {
        name: 'LCCError',
        message: `Error deleting image from IndexedDB: ${error}`,
      };
    }
  }

  public async clearAllImages(): Promise<'success' | LccError> {
    try {
      const db = await this.getDbConnection();

      return new Promise<'success' | LccError>(resolve => {
        const transaction = db.transaction([IMAGES_DB_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_DB_STORE);

        const request = store.clear();

        request.onsuccess = () => {
          resolve('success');
        };

        request.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in IndexedDB clear request: ${(event.target as IDBRequest).error}`,
          });
        };

        transaction.onerror = event => {
          resolve({
            name: 'LCCError',
            message: `Error in transaction when clearing images from IndexedDB:
              ${(event.target as IDBRequest).error}`,
          });
        };
      });
    } catch (error) {
      return {
        name: 'LCCError',
        message: `Error clearing images from IndexedDB: ${error}`,
      };
    }
  }

  private initDb(): void {
    const request = indexedDB.open(IMAGES_DB_NAME, IMAGES_DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(IMAGES_DB_STORE)) {
        db.createObjectStore(IMAGES_DB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = event => {
      this.db = (event.target as IDBOpenDBRequest).result;
    };

    request.onerror = event => {
      console.error(
        `[LCC] Error while initializing IndexedDB: ${(event.target as IDBOpenDBRequest).error}`,
      );
    };
  }

  private async getDbConnection(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(IMAGES_DB_NAME, IMAGES_DB_VERSION);

      request.onsuccess = event => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = event => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
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
