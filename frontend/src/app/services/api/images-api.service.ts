import { Observable } from 'rxjs';

import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { REQUEST_TIMEOUT, UPLOAD_TIMEOUT_MS } from '@app/constants/http';
import {
  ApiResponse,
  DataPaginationOptions,
  DbCollection,
  Id,
  Image,
  PaginatedItems,
} from '@app/models';
import { BaseImage } from '@app/models/image.model';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class ImagesApiService {
  private readonly API_BASE_URL = environment.lccApiBaseUrl;
  private readonly COLLECTION: DbCollection = 'images';

  private readonly setPaginationParams = inject(SET_PAGINATION_PARAMS);

  constructor(private readonly http: HttpClient) {}

  public getAllImagesMetadata(): Observable<ApiResponse<BaseImage[]>> {
    return this.http.get<ApiResponse<BaseImage[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/all-metadata`,
    );
  }

  public getFilteredThumbnailImages(
    options: DataPaginationOptions<Image>,
  ): Observable<ApiResponse<PaginatedItems<Image>>> {
    const params = this.setPaginationParams(options);

    return this.http.get<ApiResponse<PaginatedItems<Image>>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/thumbnails`,
      { params },
    );
  }

  public getBatchThumbnailImages(ids: Id[]): Observable<ApiResponse<Image[]>> {
    return this.http.get<ApiResponse<Image[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/batch-thumbnails`,
      { params: { ids: ids.join(',') } },
    );
  }

  public getMainImage(id: Id): Observable<ApiResponse<Image>> {
    return this.http.get<ApiResponse<Image>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${id}`,
    );
  }

  public addImages(imagesFormData: FormData): Observable<ApiResponse<Image[]>> {
    return this.http.post<ApiResponse<Image[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
      imagesFormData,
      { context: new HttpContext().set(REQUEST_TIMEOUT, UPLOAD_TIMEOUT_MS) },
    );
  }

  public updateImages(
    imagesFormData: FormData,
  ): Observable<ApiResponse<{ newImages: Image[]; updatedImages: BaseImage[] }>> {
    return this.http.put<ApiResponse<{ newImages: Image[]; updatedImages: BaseImage[] }>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
      imagesFormData,
    );
  }

  public deleteImage(id: Id): Observable<ApiResponse<Id>> {
    return this.http.delete<ApiResponse<Id>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${id}`,
    );
  }

  public deleteAlbum(album: string): Observable<ApiResponse<Id[]>> {
    return this.http.delete<ApiResponse<Id[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/album/${encodeURIComponent(album)}`,
    );
  }
}
