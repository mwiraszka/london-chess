import { Observable } from 'rxjs';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  ApiResponse,
  ArchivePlayer,
  DbCollection,
  Game,
  GamesQuery,
  GamesSummary,
  Id,
  PaginatedItems,
  Tournament,
} from '@app/models';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class GamesApiService {
  private readonly API_BASE_URL = environment.lccApiBaseUrl;
  private readonly COLLECTION: DbCollection = 'games';

  private readonly http = inject(HttpClient);

  public getGames(query: GamesQuery): Observable<ApiResponse<PaginatedItems<Game>>> {
    return this.http.get<ApiResponse<PaginatedItems<Game>>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
      { params: this.toParams(query) },
    );
  }

  public getGame(id: Id): Observable<ApiResponse<Game>> {
    return this.http.get<ApiResponse<Game>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${id}`,
    );
  }

  public getPlayers(): Observable<ApiResponse<ArchivePlayer[]>> {
    return this.http.get<ApiResponse<ArchivePlayer[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/players`,
    );
  }

  public getTournaments(): Observable<ApiResponse<Tournament[]>> {
    return this.http.get<ApiResponse<Tournament[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/tournaments`,
    );
  }

  public getSummary(): Observable<ApiResponse<GamesSummary>> {
    return this.http.get<ApiResponse<GamesSummary>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/summary`,
    );
  }

  private toParams({
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
  }: GamesQuery): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    for (const [name, value] of Object.entries(filters)) {
      if (value !== '' && value !== null) {
        params = params.set(`filter_${name}`, value);
      }
    }

    return params;
  }
}
