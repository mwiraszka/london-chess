import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
} from '@app/mocks/tournaments.mock';
import {
  ApiResponse,
  MemberTournamentResult,
  Tournament,
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
});
