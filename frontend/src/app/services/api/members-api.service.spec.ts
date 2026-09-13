import { HttpParams } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import {
  ApiResponse,
  DataPaginationOptions,
  Id,
  Member,
  PaginatedItems,
} from '@app/models';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

import { MembersApiService } from './members-api.service';

describe('MembersApiService', () => {
  let service: MembersApiService;
  let httpMock: HttpTestingController;

  const apiBaseUrl = `${environment.lccApiBaseUrl}/admin/members`;
  const mockMember = MOCK_MEMBERS[0];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MembersApiService,
        provideHttpClientTesting(),
        { provide: SET_PAGINATION_PARAMS, useValue: vi.fn() },
      ],
    });

    service = TestBed.inject(MembersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllMembers', () => {
    it('should get all members with admin scope', () => {
      const mockPaginatedResponse: ApiResponse<PaginatedItems<Member>> = {
        data: {
          items: [mockMember],
          filteredCount: 1,
          totalCount: 1,
        },
      };

      service.getAllMembers(true).subscribe(response => {
        expect(response).toEqual(mockPaginatedResponse);
      });

      const req = httpMock.expectOne(`${environment.lccApiBaseUrl}/admin/members`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getFilteredMembers', () => {
    it('should get filtered members with pagination params', () => {
      const mockPaginatedResponse: ApiResponse<PaginatedItems<Member>> = {
        data: {
          items: [mockMember],
          filteredCount: 1,
          totalCount: 1,
        },
      };

      const options: DataPaginationOptions<Member> = {
        page: 2,
        pageSize: 20,
        sortBy: 'lastName',
        sortOrder: 'asc',
        filters: {
          showInactiveMembers: { label: 'Show Inactive Members', value: false },
        },
        search: 'Carlsen',
      };

      const mockParams = new HttpParams()
        .set('page', '2')
        .set('pageSize', '20')
        .set('sortBy', 'lastName')
        .set('sortOrder', 'asc')
        .set('search', 'Carlsen');
      vi.mocked(TestBed.inject(SET_PAGINATION_PARAMS)).mockReturnValue(mockParams);

      service.getFilteredMembers(true, options).subscribe(response => {
        expect(response).toEqual(mockPaginatedResponse);
        expect(TestBed.inject(SET_PAGINATION_PARAMS)).toHaveBeenCalledWith(options);
      });

      const req = httpMock.expectOne(
        request =>
          request.url === `${environment.lccApiBaseUrl}/admin/members` &&
          request.params.get('page') === '2' &&
          request.params.get('pageSize') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getMember', () => {
    it('should get member by id', () => {
      const mockResponse: ApiResponse<Member> = {
        data: mockMember,
      };

      service.getMember(mockMember.id, true).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockMember.id}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('addMember', () => {
    it('should add new member', () => {
      const newMember: Member = { ...mockMember, id: '' };
      const mockResponse: ApiResponse<Id> = {
        data: mockMember.id,
      };

      service.addMember(newMember).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newMember);
      req.flush(mockResponse);
    });
  });

  describe('updateMember', () => {
    it('should update existing member', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockMember.id,
      };

      service.updateMember(mockMember).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockMember.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockMember);
      req.flush(mockResponse);
    });
  });

  describe('deleteMember', () => {
    it('should delete member by id', () => {
      const mockResponse: ApiResponse<Id> = {
        data: mockMember.id,
      };

      service.deleteMember(mockMember.id).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/${mockMember.id}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();
      req.flush(mockResponse);
    });
  });
});
