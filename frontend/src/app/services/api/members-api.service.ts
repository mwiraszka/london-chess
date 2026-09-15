import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  ApiResponse,
  ApiScope,
  DataPaginationOptions,
  DbCollection,
  EditableMember,
  Id,
  Member,
  PaginatedItems,
} from '@app/models';
import { SET_PAGINATION_PARAMS } from '@app/tokens';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class MembersApiService {
  private readonly API_BASE_URL = environment.lccApiBaseUrl;
  private readonly COLLECTION: DbCollection = 'members';

  private readonly setPaginationParams = inject(SET_PAGINATION_PARAMS);

  constructor(private readonly http: HttpClient) {}

  public getAllMembers(
    isAdmin: boolean,
  ): Observable<ApiResponse<PaginatedItems<Member>>> {
    const scope: ApiScope = isAdmin ? 'admin' : 'public';

    return this.http.get<ApiResponse<PaginatedItems<Member>>>(
      `${this.API_BASE_URL}/${scope}/${this.COLLECTION}`,
    );
  }

  public getFilteredMembers(
    isAdmin: boolean,
    options: DataPaginationOptions<Member>,
  ): Observable<ApiResponse<PaginatedItems<Member>>> {
    const scope: ApiScope = isAdmin ? 'admin' : 'public';
    const params = this.setPaginationParams(options);

    return this.http.get<ApiResponse<PaginatedItems<Member>>>(
      `${this.API_BASE_URL}/${scope}/${this.COLLECTION}`,
      { params },
    );
  }

  public getMember(id: Id): Observable<ApiResponse<Member>> {
    return this.http.get<ApiResponse<Member>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}/${id}`,
    );
  }

  public getMemberByNumber(
    number: number,
    isAdmin: boolean,
  ): Observable<ApiResponse<Member>> {
    const url = isAdmin
      ? `${this.API_BASE_URL}/admin/${this.COLLECTION}/number/${number}`
      : `${this.API_BASE_URL}/public/${this.COLLECTION}/${number}`;

    return this.http.get<ApiResponse<Member>>(url);
  }

  public addMember(member: EditableMember): Observable<ApiResponse<Member>> {
    return this.http.post<ApiResponse<Member>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}`,
      member,
    );
  }

  public updateMembers(
    members: Array<EditableMember & { id: Id }>,
  ): Observable<ApiResponse<Id[]>> {
    return this.http.put<ApiResponse<Id[]>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}`,
      members,
    );
  }

  public updateMember(id: Id, member: EditableMember): Observable<ApiResponse<Id>> {
    return this.http.put<ApiResponse<Id>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}/${id}`,
      member,
    );
  }

  public deleteMember(id: Id): Observable<ApiResponse<Id>> {
    return this.http.delete<ApiResponse<Id>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}/${id}`,
    );
  }
}
