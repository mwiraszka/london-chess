import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import {
  MOCK_ARCHIVE_PLAYERS,
  MOCK_GAMES,
  MOCK_GAMES_SUMMARY,
  MOCK_TOURNAMENTS,
} from '@app/mocks/games.mock';
import { ApiResponse, Game, PaginatedItems } from '@app/models';

import { environment } from '@env';

import { GamesApiService } from './games-api.service';

describe('GamesApiService', () => {
  let service: GamesApiService;
  let httpMock: HttpTestingController;

  const apiBaseUrl = `${environment.lccApiBaseUrl}/games`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GamesApiService, provideHttpClientTesting()],
    });

    service = TestBed.inject(GamesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getGames', () => {
    const response: ApiResponse<PaginatedItems<Game>> = {
      data: { items: MOCK_GAMES, filteredCount: 3, totalCount: 9119 },
    };

    it('should request the page, sort and only the filters that are set', () => {
      let received: ApiResponse<PaginatedItems<Game>> | undefined;
      service
        .getGames({
          ...INITIAL_GAMES_QUERY,
          page: 2,
          filters: {
            ...INITIAL_GAMES_QUERY.filters,
            year: 1994,
            result: '1-0',
          },
        })
        .subscribe(result => (received = result));

      const request = httpMock.expectOne(({ url }) => url === apiBaseUrl);
      request.flush(response);

      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys().sort()).toEqual([
        'filter_result',
        'filter_year',
        'page',
        'pageSize',
        'sortBy',
        'sortOrder',
      ]);
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.get('pageSize')).toBe('25');
      expect(request.request.params.get('sortBy')).toBe('date');
      expect(request.request.params.get('sortOrder')).toBe('desc');
      expect(request.request.params.get('filter_result')).toBe('1-0');
      expect(request.request.params.get('filter_year')).toBe('1994');
      expect(received).toEqual(response);
    });
  });

  describe('getGame', () => {
    it('should request the game by id', () => {
      let received: ApiResponse<Game> | undefined;
      service.getGame(MOCK_GAMES[0].id).subscribe(result => (received = result));

      const request = httpMock.expectOne(`${apiBaseUrl}/${MOCK_GAMES[0].id}`);
      request.flush({ data: MOCK_GAMES[0] });

      expect(request.request.method).toBe('GET');
      expect(received).toEqual({ data: MOCK_GAMES[0] });
    });
  });

  describe('reference data', () => {
    it('should request the players', () => {
      service.getPlayers().subscribe();

      httpMock.expectOne(`${apiBaseUrl}/players`).flush({ data: MOCK_ARCHIVE_PLAYERS });
    });

    it('should request the tournaments', () => {
      service.getTournaments().subscribe();

      httpMock.expectOne(`${apiBaseUrl}/tournaments`).flush({ data: MOCK_TOURNAMENTS });
    });

    it('should request the summary', () => {
      service.getSummary().subscribe();

      httpMock.expectOne(`${apiBaseUrl}/summary`).flush({ data: MOCK_GAMES_SUMMARY });
    });
  });
});
