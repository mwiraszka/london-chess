import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  ApiResponse,
  DataPaginationOptions,
  DbCollection,
  Event,
  Id,
  PaginatedItems,
} from '@app/models';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class EventsApiService {
  private readonly API_BASE_URL = environment.lccApiBaseUrl;
  private readonly COLLECTION: DbCollection = 'events';

  private readonly setPaginationParams = inject(SET_PAGINATION_PARAMS);

  constructor(private readonly http: HttpClient) {}

  public getAllEvents(): Observable<ApiResponse<PaginatedItems<Event>>> {
    return this.http.get<ApiResponse<PaginatedItems<Event>>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
    );
  }

  public getFilteredEvents(
    options: DataPaginationOptions<Event>,
  ): Observable<ApiResponse<PaginatedItems<Event>>> {
    const params = this.setPaginationParams(options);
    return this.http.get<ApiResponse<PaginatedItems<Event>>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
      { params },
    );
  }

  public getEvent(id: Id): Observable<ApiResponse<Event>> {
    return this.http.get<ApiResponse<Event>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${id}`,
    );
  }

  public addEvent(event: Event): Observable<ApiResponse<Id>> {
    return this.http.post<ApiResponse<Id>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
      event,
    );
  }

  public updateEvent(event: Event): Observable<ApiResponse<Id>> {
    return this.http.put<ApiResponse<Id>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${event.id}`,
      event,
    );
  }

  public deleteEvent(id: Id): Observable<ApiResponse<Id>> {
    return this.http.delete<ApiResponse<Id>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${id}`,
    );
  }
}
