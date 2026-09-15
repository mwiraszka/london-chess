import { HttpParams } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import {
  ApiResponse,
  DataPaginationOptions,
  Event,
  Id,
  PaginatedItems,
} from '@app/models';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

import { EventsApiService } from './events-api.service';

describe('EventsApiService', () => {
  let service: EventsApiService;
  let httpMock: HttpTestingController;

  const apiBaseUrl = `${environment.lccApiBaseUrl}/events`;
  const mockEvent = MOCK_EVENTS[0];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EventsApiService,
        provideHttpClientTesting(),
        { provide: SET_PAGINATION_PARAMS, useValue: vi.fn() },
      ],
    });

    service = TestBed.inject(EventsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllEvents', () => {
    it('should get all events without pagination params', () => {
      const mockPaginatedResponse: ApiResponse<PaginatedItems<Event>> = {
        data: {
          items: [mockEvent],
          filteredCount: 1,
          totalCount: 1,
        },
      };

      service.getAllEvents().subscribe(response => {
        expect(response).toEqual(mockPaginatedResponse);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getFilteredEvents', () => {
    it('should get filtered events with pagination params', () => {
      const mockPaginatedResponse: ApiResponse<PaginatedItems<Event>> = {
        data: {
          items: [mockEvent],
          filteredCount: 1,
          totalCount: 1,
        },
      };

      const options: DataPaginationOptions<Event> = {
        page: 2,
        pageSize: 20,
        sortBy: 'eventDate',
        sortOrder: 'asc',
        filters: {
          showPastEvents: { label: 'Show Past Events', value: false },
        },
        search: 'tournament',
      };

      const mockParams = new HttpParams()
        .set('page', '2')
        .set('pageSize', '20')
        .set('sortBy', 'eventDate')
        .set('sortOrder', 'asc')
        .set('search', 'tournament');
      vi.mocked(TestBed.inject(SET_PAGINATION_PARAMS)).mockReturnValue(mockParams);

      service.getFilteredEvents(options).subscribe(response => {
        expect(response).toEqual(mockPaginatedResponse);
        expect(TestBed.inject(SET_PAGINATION_PARAMS)).toHaveBeenCalledWith(options);
      });

      const req = httpMock.expectOne(
        request =>
          request.url === apiBaseUrl &&
          request.params.get('page') === '2' &&
          request.params.get('pageSize') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getEvent', () => {
    it('should get event by id', () => {
      const mockResponse: ApiResponse<Event> = {
        data: mockEvent,
      };

      service.getEvent(mockEvent.id).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockEvent.id}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('addEvent', () => {
    it('should add new event', () => {
      const newEvent: Event = { ...mockEvent, id: '' };
      const mockResponse: ApiResponse<Id> = {
        data: mockEvent.id,
      };

      service.addEvent(newEvent).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newEvent);
      req.flush(mockResponse);
    });
  });

  describe('updateEvent', () => {
    it('should update existing event', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockEvent.id,
      };

      service.updateEvent(mockEvent).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockEvent.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockEvent);
      req.flush(mockResponse);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event by id', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockEvent.id,
      };

      service.deleteEvent(mockEvent.id).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockEvent.id}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();
      req.flush(mockResponse);
    });
  });
});
