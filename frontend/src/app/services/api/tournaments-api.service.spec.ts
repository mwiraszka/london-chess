import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MOCK_MODIFICATION_INFOS } from '@app/mocks/modification-info.mock';
import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
  MOCK_UPCOMING_TOURNAMENT,
} from '@app/mocks/tournaments.mock';
import {
  ApiResponse,
  MemberTournamentResult,
  PlayerNameMatch,
  Tournament,
  TournamentInput,
  TournamentRegistrant,
  TournamentSummary,
} from '@app/models';

import { environment } from '@env';

import { TournamentsApiService } from './tournaments-api.service';

describe('TournamentsApiService', () => {
  let service: TournamentsApiService;
  let httpMock: HttpTestingController;

  const apiBaseUrl = `${environment.lccApiBaseUrl}/tournaments`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TournamentsApiService, provideHttpClientTesting()],
    });

    service = TestBed.inject(TournamentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request every tournament', () => {
    let received: ApiResponse<TournamentSummary[]> | undefined;
    service.getTournaments().subscribe(result => (received = result));

    const request = httpMock.expectOne(apiBaseUrl);
    request.flush({ data: MOCK_TOURNAMENT_SUMMARIES });

    expect(request.request.method).toBe('GET');
    expect(received).toEqual({ data: MOCK_TOURNAMENT_SUMMARIES });
  });

  it('should request a tournament by number', () => {
    let received: ApiResponse<Tournament> | undefined;
    service.getTournament(90).subscribe(result => (received = result));

    const request = httpMock.expectOne(`${apiBaseUrl}/90`);
    request.flush({ data: MOCK_TOURNAMENTS[0] });

    expect(request.request.method).toBe('GET');
    expect(received).toEqual({ data: MOCK_TOURNAMENTS[0] });
  });

  it("should request a member's results by member number", () => {
    let received: ApiResponse<MemberTournamentResult[]> | undefined;
    service.getMemberTournaments(2).subscribe(result => (received = result));

    const request = httpMock.expectOne(`${apiBaseUrl}/members/2`);
    request.flush({ data: MOCK_MEMBER_TOURNAMENT_RESULTS });

    expect(request.request.method).toBe('GET');
    expect(received).toEqual({ data: MOCK_MEMBER_TOURNAMENT_RESULTS });
  });

  describe('managing tournaments', () => {
    const input: TournamentInput = {
      name: 'Fall Rapid',
      subtitle: '',
      date: '2050-10-15',
      endDate: null,
      format: 'swiss',
      timeControl: 'G25+5',
      isRated: true,
      articleId: null,
      registrationOpens: null,
      registrationCloses: null,
      sections: null,
      games: null,
      modificationInfo: MOCK_MODIFICATION_INFOS[0],
    };

    it('should add a tournament and receive its number', () => {
      let received: ApiResponse<number> | undefined;
      service.addTournament(input).subscribe(result => (received = result));

      const request = httpMock.expectOne(apiBaseUrl);
      request.flush({ data: 184 });

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(input);
      expect(received).toEqual({ data: 184 });
    });

    it('should update a tournament by number', () => {
      service.updateTournament(184, input).subscribe();

      const request = httpMock.expectOne(`${apiBaseUrl}/184`);
      request.flush({ data: 184 });

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual(input);
    });

    it('should delete a tournament by number', () => {
      service.deleteTournament(184).subscribe();

      const request = httpMock.expectOne(`${apiBaseUrl}/184`);
      request.flush({ data: 184 });

      expect(request.request.method).toBe('DELETE');
    });

    it('should ask which player names the archive already knows', () => {
      const matches: PlayerNameMatch[] = [
        { name: 'Doe, John', playerId: '64b7f0c2a1d3e4f5a6b7c8a1', memberNumber: 2 },
      ];
      let received: ApiResponse<PlayerNameMatch[]> | undefined;
      service.matchPlayers(['Doe, John']).subscribe(result => (received = result));

      const request = httpMock.expectOne(`${apiBaseUrl}/player-matches`);
      request.flush({ data: matches });

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ names: ['Doe, John'] });
      expect(received).toEqual({ data: matches });
    });
  });

  describe('registration', () => {
    const registrants: TournamentRegistrant[] = MOCK_UPCOMING_TOURNAMENT.registrants;

    it('should register the signed-in member', () => {
      let received: ApiResponse<TournamentRegistrant[]> | undefined;
      service.register(184).subscribe(result => (received = result));

      const request = httpMock.expectOne(`${apiBaseUrl}/184/registration`);
      request.flush({ data: registrants });

      expect(request.request.method).toBe('POST');
      expect(received).toEqual({ data: registrants });
    });

    it('should withdraw the signed-in member', () => {
      service.withdraw(184).subscribe();

      const request = httpMock.expectOne(`${apiBaseUrl}/184/registration`);
      request.flush({ data: [] });

      expect(request.request.method).toBe('DELETE');
    });
  });
});
