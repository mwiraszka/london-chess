import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  ApiResponse,
  DbCollection,
  MemberTournamentResult,
  PlayerNameMatch,
  Tournament,
  TournamentInput,
  TournamentRegistrant,
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

  public addTournament(tournament: TournamentInput): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.API_BASE_URL}/${this.COLLECTION}`,
      tournament,
    );
  }

  public updateTournament(
    tournamentNumber: number,
    tournament: TournamentInput,
  ): Observable<ApiResponse<number>> {
    return this.http.put<ApiResponse<number>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${tournamentNumber}`,
      tournament,
    );
  }

  public deleteTournament(tournamentNumber: number): Observable<ApiResponse<number>> {
    return this.http.delete<ApiResponse<number>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${tournamentNumber}`,
    );
  }

  public matchPlayers(names: string[]): Observable<ApiResponse<PlayerNameMatch[]>> {
    return this.http.post<ApiResponse<PlayerNameMatch[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/player-matches`,
      { names },
    );
  }

  public register(
    tournamentNumber: number,
  ): Observable<ApiResponse<TournamentRegistrant[]>> {
    return this.http.post<ApiResponse<TournamentRegistrant[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${tournamentNumber}/registration`,
      {},
    );
  }

  public withdraw(
    tournamentNumber: number,
  ): Observable<ApiResponse<TournamentRegistrant[]>> {
    return this.http.delete<ApiResponse<TournamentRegistrant[]>>(
      `${this.API_BASE_URL}/${this.COLLECTION}/${tournamentNumber}/registration`,
    );
  }
}
