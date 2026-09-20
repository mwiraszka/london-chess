import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  ApiResponse,
  DbCollection,
  MemberTournamentResult,
  Tournament,
  TournamentSummary,
} from '@app/models';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class TournamentsApiService {
  private readonly API_BASE_URL = environment.lccApiBaseUrl;
  private readonly COLLECTION: DbCollection = 'tournaments';

  private readonly http = inject(HttpClient);

  public getTournaments(): Observable<ApiResponse<TournamentSummary[]>> {
    return this.http.get<ApiResponse<TournamentSummary[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
    );
  }

  public getTournament(tournamentNumber: number): Observable<ApiResponse<Tournament>> {
    return this.http.get<ApiResponse<Tournament>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${tournamentNumber}`,
    );
  }

  public getMemberTournaments(
    memberNumber: number,
  ): Observable<ApiResponse<MemberTournamentResult[]>> {
    return this.http.get<ApiResponse<MemberTournamentResult[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/members/${memberNumber}`,
    );
  }
}
