import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { EntityType, Image, LccError, Member } from '@app/models';

import { exportDataToCsv } from './export-data-to-csv.util';

describe('exportDataToCsv', () => {
  let appendChildSpy: MockInstance;
  let blobSpy: MockInstance;
  let clickSpy: MockInstance;
  let createElementSpy: MockInstance;
  let mockLink: HTMLAnchorElement;
  let removeChildSpy: MockInstance;
  let setAttributeSpy: Mock;

  beforeEach(() => {
    setAttributeSpy = vi.fn();
    clickSpy = vi.fn();

    mockLink = {
      click: clickSpy,
      download: '',
      href: '',
      setAttribute: setAttributeSpy,
      style: {} as CSSStyleDeclaration,
    } as unknown as HTMLAnchorElement;

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockLink);
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => mockLink);

    // Mock URL.createObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

    // Mock Blob constructor. Vitest cannot `new` an arrow-fn mock, so use a
    // regular function expression which is constructable.
    blobSpy = (vi.spyOn(window, 'Blob') as unknown as MockInstance).mockImplementation(
      function (content: BlobPart[], options?: BlobPropertyBag) {
        return { content, options } as unknown as Blob;
      },
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should export Member data to CSV successfully', () => {
    const result = exportDataToCsv(MOCK_MEMBERS, 'members-export.csv');

    expect(result).toBe(MOCK_MEMBERS.length);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(window.Blob).toHaveBeenCalledWith([expect.any(String)], {
      type: 'text/csv;charset=utf-8;',
    });
    expect(setAttributeSpy).toHaveBeenCalledWith('download', 'members-export.csv');
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
  });

  it('should export Article data to CSV successfully', () => {
    const result = exportDataToCsv(MOCK_ARTICLES, 'articles.csv');

    expect(result).toBe(MOCK_ARTICLES.length);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(setAttributeSpy).toHaveBeenCalledWith('download', 'articles.csv');
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
  });

  it('should export Event data to CSV successfully', () => {
    const result = exportDataToCsv(MOCK_EVENTS, 'events-schedule.csv');

    expect(result).toBe(MOCK_EVENTS.length);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(setAttributeSpy).toHaveBeenCalledWith('download', 'events-schedule.csv');
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
  });

  it('should export Image data to CSV successfully', () => {
    const result = exportDataToCsv(MOCK_IMAGES, 'photos.csv');

    expect(result).toBe(MOCK_IMAGES.length);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(setAttributeSpy).toHaveBeenCalledWith('download', 'photos.csv');
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
  });

  it('should handle empty data array', () => {
    const mockData: EntityType[] = [];

    const result = exportDataToCsv(mockData, 'empty.csv');

    expect(result).toEqual({
      name: 'LCCError',
      message: 'No data available for export',
    } as LccError);

    expect(createElementSpy).not.toHaveBeenCalled();
    expect(window.Blob).not.toHaveBeenCalled();
  });

  it('should handle errors during export', () => {
    blobSpy.mockImplementation(() => {
      throw new Error('Blob creation failed');
    });

    const result = exportDataToCsv(MOCK_MEMBERS, 'error-test.csv');

    expect(result).toEqual({
      name: 'LCCError',
      message: 'Unknown error occurred while exporting data to CSV',
    } as LccError);
  });

  it('should handle large datasets', () => {
    const mockMembers: Member[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i + 1}`,
      number: i,
      firstName: `User${i + 1}`,
      lastName: `Lastname${i + 1}`,
      rating: `${1500 + (i % 500)}`,
      peakRating: `${1550 + (i % 500)}`,
      email: `user${i + 1}@example.com`,
      phoneNumber: `555${String(i).padStart(7, '0')}`,
      city: i % 2 === 0 ? 'London' : 'Manchester',
      yearOfBirth: `${1980 + (i % 40)}`,
      chessComUsername: `user${i + 1}`,
      lichessUsername: `user${i + 1}lich`,
      isActive: i % 3 !== 0,
      dateJoined: new Date(2020, i % 12, (i % 28) + 1).toISOString(),
      modificationInfo: {
        createdBy: 'admin',
        createdByNumber: null,
        dateCreated: new Date(2020, i % 12, (i % 28) + 1).toISOString(),
        lastEditedBy: 'admin',
        lastEditedByNumber: null,
        dateLastEdited: new Date(2020, i % 12, (i % 28) + 1).toISOString(),
      },
      avatarUrl: null,
    }));

    const result = exportDataToCsv(mockMembers, 'large-dataset.csv');

    expect(result).toBe(1000);
    expect(window.Blob).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalled();
  });

  it('should handle boolean and numeric values correctly', () => {
    const mockImages: Image[] = [
      {
        id: 'img123',
        filename: 'test.jpg',
        mainFileSize: 2048000,
        mainWidth: 1920,
        mainHeight: 1080,
        thumbnailFileSize: 987654,
        thumbnailWidth: 300,
        thumbnailHeight: 169,
        caption: 'Test Image',
        album: 'Test Album',
        albumCover: true,
        albumOrdinality: '1',
        articleAppearances: 0,
        modificationInfo: {
          createdBy: 'user',
          createdByNumber: null,
          dateCreated: '2024-01-01T00:00:00.000Z',
          lastEditedBy: 'user',
          lastEditedByNumber: null,
          dateLastEdited: '2024-01-01T00:00:00.000Z',
        },
      },
    ];

    const result = exportDataToCsv(mockImages, 'types-test.csv');

    expect(result).toBe(1);
    const blobCall = blobSpy.mock.calls[blobSpy.mock.calls.length - 1];
    const csvContent = blobCall[0][0] as string;

    expect(csvContent).toContain('true');
    expect(csvContent).toContain('987654');
    expect(csvContent).toContain('0');
  });
});
