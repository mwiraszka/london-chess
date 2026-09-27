import { TestBed } from '@angular/core/testing';

import { IMAGES_DB_STORE } from '@app/constants/images';
import { IndexedDbImageData, LccError } from '@app/models';

import { ImageFileService } from './image-file.service';

type Failure = 'request' | 'transaction' | null;

interface FakeEvent {
  target: FakeRequest;
}

type FakeHandler = ((event: FakeEvent) => void) | null;

class FakeRequest {
  public result: object | string | null | undefined = undefined;
  public error: string | null = null;
  public onsuccess: FakeHandler = null;
  public onerror: FakeHandler = null;
  public onupgradeneeded: FakeHandler = null;
}

class FakeTransaction {
  public onerror: FakeHandler = null;

  constructor(private readonly database: FakeDatabase) {}

  public objectStore(): FakeObjectStore {
    return new FakeObjectStore(this.database, this);
  }
}

class FakeObjectStore {
  constructor(
    private readonly database: FakeDatabase,
    private readonly transaction: FakeTransaction,
  ) {}

  public put(value: IndexedDbImageData): FakeRequest {
    return this.settle(() => {
      this.database.records.set(value.id, value);
      return value.id;
    });
  }

  public get(id: string): FakeRequest {
    return this.settle(() => this.database.records.get(id));
  }

  public delete(id: string): FakeRequest {
    return this.settle(() => {
      this.database.records.delete(id);
      return undefined;
    });
  }

  public clear(): FakeRequest {
    return this.settle(() => {
      this.database.records.clear();
      return undefined;
    });
  }

  public openCursor(): FakeRequest {
    const values = [...this.database.records.values()];
    let index = 0;
    const request = new FakeRequest();
    const advance = (): void => {
      queueMicrotask(() => {
        if (!this.fail(request)) {
          request.result =
            index < values.length ? { value: values[index++], continue: advance } : null;
          request.onsuccess?.({ target: request });
        }
      });
    };

    advance();
    return request;
  }

  private settle(operation: () => object | string | undefined): FakeRequest {
    const request = new FakeRequest();
    queueMicrotask(() => {
      if (!this.fail(request)) {
        request.result = operation();
        request.onsuccess?.({ target: request });
      }
    });
    return request;
  }

  private fail(request: FakeRequest): boolean {
    if (!this.database.failure) {
      return false;
    }
    request.error = `${this.database.failure} failed`;
    if (this.database.failure === 'request') {
      request.onerror?.({ target: request });
    } else {
      this.transaction.onerror?.({ target: request });
    }
    return true;
  }
}

class FakeDatabase {
  public readonly records = new Map<string, IndexedDbImageData>();
  public readonly storeNames = new Set<string>();
  public readonly objectStoreNames = {
    contains: (name: string): boolean => this.storeNames.has(name),
  };
  public failure: Failure = null;

  public createObjectStore(name: string): void {
    this.storeNames.add(name);
  }

  public transaction(): FakeTransaction {
    return new FakeTransaction(this);
  }
}

class FakeIndexedDb {
  public readonly database = new FakeDatabase();
  public failOpen = false;

  public readonly open = vi.fn((): FakeRequest => {
    const request = new FakeRequest();
    queueMicrotask(() => {
      if (this.failOpen) {
        request.error = 'open failed';
        request.onerror?.({ target: request });
        return;
      }
      request.result = this.database;
      request.onupgradeneeded?.({ target: request });
      request.onsuccess?.({ target: request });
    });
    return request;
  });
}

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

function pngFile(name = 'photo.png', size?: number): File {
  const content = size
    ? new Uint8Array(size)
    : Uint8Array.from(atob('iVBORw0KGgo='), c => c.charCodeAt(0));
  return new File([content], name, { type: 'image/png' });
}

function lccError(result: object | string): LccError {
  expect(result).toEqual(expect.objectContaining({ name: 'LCCError' }));
  return result as LccError;
}

describe('ImageFileService', () => {
  let fakeIndexedDb: FakeIndexedDb;
  let consoleErrorSpy: MockInstance;

  const createService = (): ImageFileService => {
    vi.stubGlobal('indexedDB', fakeIndexedDb);
    return TestBed.inject(ImageFileService);
  };

  beforeEach(() => {
    fakeIndexedDb = new FakeIndexedDb();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('database setup', () => {
    it('should create the image store on first use', async () => {
      const service = createService();

      await service.getAllImages();

      expect(fakeIndexedDb.database.storeNames.has(IMAGES_DB_STORE)).toBe(true);
    });

    it('should keep an existing image store', async () => {
      fakeIndexedDb.database.createObjectStore(IMAGES_DB_STORE);
      const createObjectStoreSpy = vi.spyOn(fakeIndexedDb.database, 'createObjectStore');
      const service = createService();

      await service.getAllImages();

      expect(createObjectStoreSpy).not.toHaveBeenCalled();
    });

    it('should reuse the connection opened on start-up', async () => {
      const service = createService();
      await service.getAllImages();
      fakeIndexedDb.open.mockClear();

      await service.getAllImages();

      expect(fakeIndexedDb.open).not.toHaveBeenCalled();
    });

    it('should open a connection when used before start-up has finished', async () => {
      const service = createService();

      const result = await service.getAllImages();

      expect(result).toEqual([]);
      expect(fakeIndexedDb.open).toHaveBeenCalledTimes(2);
    });

    it('should log a failure to open the database on start-up', async () => {
      fakeIndexedDb.failOpen = true;
      const service = createService();

      await service.getAllImages();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('open failed'),
      );
    });
  });

  describe('storeImageFile', () => {
    it('should store a supported image under a sanitized filename', async () => {
      const service = createService();

      const result = await service.storeImageFile('image-1', pngFile('my photo!.png'));

      expect(result).toEqual({
        id: 'image-1',
        filename: 'myphoto.png',
        dataUrl: PNG_DATA_URL,
      });
      expect(await service.getImage('image-1')).toEqual(result);
    });

    it.each(['image/bmp', 'image/webp'])('should reject %s files', async type => {
      const service = createService();

      const result = await service.storeImageFile(
        'image-1',
        new File(['test'], 'test.img', { type }),
      );

      expect(lccError(result).message).toContain(type);
      expect(fakeIndexedDb.database.records.size).toBe(0);
    });

    it('should reject an image larger than 2.5 MB', async () => {
      const service = createService();

      const result = await service.storeImageFile(
        'image-1',
        pngFile('big.png', 2_700_000),
      );

      lccError(result);
      expect(fakeIndexedDb.database.records.size).toBe(0);
    });

    it('should reject a file that cannot be converted', async () => {
      const service = createService();

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
      const service = createService();

      const result = await service.storeImageFile('image-1', pngFile());

      lccError(result);
    });

    it('should replace every other stored image when asked to', async () => {
      const service = createService();
      await service.storeImageFile('image-1', pngFile());

      await service.storeImageFile('image-2', pngFile(), true);

      expect([...fakeIndexedDb.database.records.keys()]).toEqual(['image-2']);
    });

    it('should not store the image when clearing the others fails', async () => {
      const service = createService();
      await service.getAllImages();
      fakeIndexedDb.database.failure = 'request';

      const result = await service.storeImageFile('image-1', pngFile(), true);

      expect(lccError(result).message).toContain('clear');
    });
  });

  describe('getAllImages', () => {
    it('should return every stored image', async () => {
      const service = createService();
      await service.storeImageFile('image-1', pngFile('one.png'));
      await service.storeImageFile('image-2', pngFile('two.png'));

      const result = await service.getAllImages();

      expect(result).toEqual([
        { id: 'image-1', filename: 'one.png', dataUrl: PNG_DATA_URL },
        { id: 'image-2', filename: 'two.png', dataUrl: PNG_DATA_URL },
      ]);
    });
  });

  describe('deleteImage', () => {
    it('should remove only the given image', async () => {
      const service = createService();
      await service.storeImageFile('image-1', pngFile());
      await service.storeImageFile('image-2', pngFile());

      const result = await service.deleteImage('image-1');

      expect(result).toBe('success');
      expect([...fakeIndexedDb.database.records.keys()]).toEqual(['image-2']);
    });
  });

  describe('clearAllImages', () => {
    it('should remove every stored image', async () => {
      const service = createService();
      await service.storeImageFile('image-1', pngFile());

      const result = await service.clearAllImages();

      expect(result).toBe('success');
      expect(fakeIndexedDb.database.records.size).toBe(0);
    });
  });

  describe('failures', () => {
    type Operation = (service: ImageFileService) => Promise<object | string>;

    const operations: Array<[string, Operation]> = [
      ['storeImageFile', service => service.storeImageFile('image-1', pngFile())],
      ['getImage', service => service.getImage('image-1')],
      ['getAllImages', service => service.getAllImages()],
      ['deleteImage', service => service.deleteImage('image-1')],
      ['clearAllImages', service => service.clearAllImages()],
    ];

    it.each(operations)(
      '%s should resolve with an error when the database cannot be opened',
      async (_name, operation) => {
        fakeIndexedDb.failOpen = true;
        const service = createService();

        const result = await operation(service);

        expect(lccError(result).message).toContain('open failed');
      },
    );

    it.each(operations)(
      '%s should resolve with an error when its request fails',
      async (_name, operation) => {
        const service = createService();
        await service.getAllImages();
        fakeIndexedDb.database.failure = 'request';

        const result = await operation(service);

        expect(lccError(result).message).toContain('request failed');
      },
    );

    it.each(operations)(
      '%s should resolve with an error when its transaction fails',
      async (_name, operation) => {
        const service = createService();
        await service.getAllImages();
        fakeIndexedDb.database.failure = 'transaction';

        const result = await operation(service);

        expect(lccError(result).message).toContain('transaction failed');
      },
    );
  });
});
