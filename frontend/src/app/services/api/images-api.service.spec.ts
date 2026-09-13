import { pick } from 'lodash';

import { HttpParams } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BASE_IMAGE_PROPERTIES } from '@app/constants';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import {
  ApiResponse,
  BaseImage,
  DataPaginationOptions,
  Id,
  Image,
  PaginatedItems,
} from '@app/models';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

import { ImagesApiService } from './images-api.service';

describe('ImagesApiService', () => {
  let service: ImagesApiService;
  let httpMock: HttpTestingController;

  const apiBaseUrl = `${environment.lccApiBaseUrl}/images`;
  const mockImage = MOCK_IMAGES[0];
  const mockBaseImages: BaseImage[] = MOCK_IMAGES.map(image =>
    pick(image, BASE_IMAGE_PROPERTIES),
  );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ImagesApiService,
        provideHttpClientTesting(),
        { provide: SET_PAGINATION_PARAMS, useValue: vi.fn() },
      ],
    });

    service = TestBed.inject(ImagesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllImagesMetadata', () => {
    it('should get all images metadata', () => {
      const mockResponse: ApiResponse<BaseImage[]> = {
        data: mockBaseImages,
      };

      service.getAllImagesMetadata().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.data).toHaveLength(mockBaseImages.length);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/all-metadata`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getFilteredThumbnailImages', () => {
    it('should get filtered thumbnail images with pagination', () => {
      const mockPaginatedResponse: ApiResponse<PaginatedItems<Image>> = {
        data: {
          items: [mockImage],
          filteredCount: 1,
          totalCount: 1,
        },
      };

      const options: DataPaginationOptions<Image> = {
        page: 2,
        pageSize: 25,
        sortBy: 'filename',
        sortOrder: 'asc',
        filters: null,
        search: 'tournament',
      };

      const mockParams = new HttpParams().set('page', '2').set('pageSize', '25');
      vi.mocked(TestBed.inject(SET_PAGINATION_PARAMS)).mockReturnValue(mockParams);

      service.getFilteredThumbnailImages(options).subscribe(response => {
        expect(response).toEqual(mockPaginatedResponse);
        expect(TestBed.inject(SET_PAGINATION_PARAMS)).toHaveBeenCalledWith(options);
      });

      const req = httpMock.expectOne(
        request =>
          request.url === `${apiBaseUrl}/thumbnails` &&
          request.params.get('page') === '2',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getBatchThumbnailImages', () => {
    it('should get batch of thumbnail images by ids', () => {
      const ids = MOCK_IMAGES.slice(0, 3).map(image => image.id);
      const commaSeparatedIds = ids.join(',');
      const mockResponse: ApiResponse<Image[]> = {
        data: MOCK_IMAGES.slice(0, 3),
      };

      service.getBatchThumbnailImages(ids).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.data).toHaveLength(3);
      });

      const req = httpMock.expectOne(
        `${apiBaseUrl}/batch-thumbnails?ids=${commaSeparatedIds}`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('ids')).toBe(commaSeparatedIds);
      req.flush(mockResponse);
    });

    it('should handle single id', () => {
      const mockResponse: ApiResponse<Image[]> = {
        data: [mockImage],
      };

      service.getBatchThumbnailImages([mockImage.id]).subscribe();

      const req = httpMock.expectOne(
        `${apiBaseUrl}/batch-thumbnails?ids=${mockImage.id}`,
      );
      expect(req.request.params.get('ids')).toBe(mockImage.id);
      req.flush(mockResponse);
    });
  });

  describe('getMainImage', () => {
    it('should get main image by id', () => {
      const mockResponse: ApiResponse<Image> = {
        data: mockImage,
      };

      service.getMainImage(mockImage.id).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockImage.id}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('addImages', () => {
    it('should add multiple images via FormData', () => {
      const formData = new FormData();
      formData.append('images', new File([''], 'test1.jpg'));
      formData.append('images', new File([''], 'test2.jpg'));

      const mockResponse: ApiResponse<Image[]> = {
        data: [
          { ...mockImage, id: 'new-1', filename: 'test1.jpg' },
          { ...mockImage, id: 'new-2', filename: 'test2.jpg' },
        ],
      };

      service.addImages(formData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.data).toHaveLength(2);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBe(formData);
      req.flush(mockResponse);
    });

    it('should handle single image upload', () => {
      const formData = new FormData();
      formData.append('image', new File([''], 'single.jpg'));

      const mockResponse: ApiResponse<Image[]> = {
        data: [{ ...mockImage, filename: 'single.jpg' }],
      };

      service.addImages(formData).subscribe();

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.body).toBe(formData);
      req.flush(mockResponse);
    });
  });

  describe('updateImages', () => {
    it('should update images via FormData and return new and updated images', () => {
      const formData = new FormData();
      formData.append('files', new File([''], 'new.jpg'));
      formData.append(
        'imageMetadata',
        JSON.stringify({ id: 'new-1', filename: 'new.jpg' }),
      );
      formData.append('existingImages', JSON.stringify([mockBaseImages[0]]));

      const newImage = { ...mockImage, id: 'new-1', filename: 'new.jpg' };
      const mockResponse: ApiResponse<{
        newImages: Image[];
        updatedImages: BaseImage[];
      }> = {
        data: { newImages: [newImage], updatedImages: [mockBaseImages[0]] },
      };

      service.updateImages(formData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.data.newImages.length).toBe(1);
        expect(response.data.updatedImages.length).toBe(1);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBe(formData);
      req.flush(mockResponse);
    });

    it('should handle updates with only existing images', () => {
      const formData = new FormData();
      formData.append(
        'existingImages',
        JSON.stringify([mockBaseImages[0], mockBaseImages[1]]),
      );

      const mockResponse: ApiResponse<{
        newImages: Image[];
        updatedImages: BaseImage[];
      }> = {
        data: { newImages: [], updatedImages: [mockBaseImages[0], mockBaseImages[1]] },
      };

      service.updateImages(formData).subscribe(response => {
        expect(response.data.newImages.length).toBe(0);
        expect(response.data.updatedImages.length).toBe(2);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.body).toBe(formData);
      req.flush(mockResponse);
    });

    it('should handle updates with only new images', () => {
      const formData = new FormData();
      formData.append('files', new File([''], 'new1.jpg'));
      formData.append(
        'imageMetadata',
        JSON.stringify({ id: 'new-1', filename: 'new1.jpg' }),
      );
      formData.append('files', new File([''], 'new2.jpg'));
      formData.append(
        'imageMetadata',
        JSON.stringify({ id: 'new-2', filename: 'new2.jpg' }),
      );

      const newImages = [
        { ...mockImage, id: 'new-1', filename: 'new1.jpg' },
        { ...mockImage, id: 'new-2', filename: 'new2.jpg' },
      ];

      const mockResponse: ApiResponse<{
        newImages: Image[];
        updatedImages: BaseImage[];
      }> = {
        data: { newImages, updatedImages: [] },
      };

      service.updateImages(formData).subscribe(response => {
        expect(response.data.newImages.length).toBe(2);
        expect(response.data.updatedImages.length).toBe(0);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.body).toBe(formData);
      req.flush(mockResponse);
    });
  });

  describe('deleteImage', () => {
    it('should delete image by id', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockImage.id,
      };

      service.deleteImage(mockImage.id).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockImage.id}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();
      req.flush(mockResponse);
    });
  });

  describe('deleteAlbum', () => {
    it('should delete entire album', () => {
      const albumName = 'tournament-2024';
      const mockResponse: ApiResponse<Id[]> = {
        data: ['123', '234', '345'],
      };

      service.deleteAlbum(albumName).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.data).toHaveLength(3);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/album/tournament-2024`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should encode album names with special characters', () => {
      const specialAlbum = 'Album Title with Spaces & Chars';

      service.deleteAlbum(specialAlbum).subscribe();

      const expectedUrl = `${apiBaseUrl}/album/Album%20Title%20with%20Spaces%20%26%20Chars`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: [], message: 'Success' });
    });
  });
});
