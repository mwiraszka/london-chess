import { Observable } from 'rxjs';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  ApiResponse,
  ApiScope,
  DataPaginationOptions,
  DbCollection,
  EditableMember,
  Id,
  Member,
  MemberRatingsUpdate,
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

  public getAllMembers(scope: ApiScope): Observable<ApiResponse<PaginatedItems<Member>>> {
    return this.http.get<ApiResponse<PaginatedItems<Member>>>(
      `${this.API_BASE_URL}/${scope}/${this.COLLECTION}`,
    );
  }

  public getFilteredMembers(
    scope: ApiScope,
    options: DataPaginationOptions<Member>,
  ): Observable<ApiResponse<PaginatedItems<Member>>> {
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
    scope: ApiScope,
  ): Observable<ApiResponse<Member>> {
    const url =
      scope === 'admin'
        ? `${this.API_BASE_URL}/admin/${this.COLLECTION}/number/${number}`
        : `${this.API_BASE_URL}/public/${this.COLLECTION}/${number}`;

    return this.http.get<ApiResponse<Member>>(url);
  }

  public addMember(
    member: EditableMember,
    notifyMember: boolean,
  ): Observable<ApiResponse<Member>> {
    return this.http.post<ApiResponse<Member>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}`,
      member,
      { params: this.notifyParams(notifyMember) },
    );
  }

  public updateMembers(
    members: Array<EditableMember & { id: Id }>,
  ): Observable<ApiResponse<MemberRatingsUpdate>> {
    return this.http.put<ApiResponse<MemberRatingsUpdate>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}`,
      members,
    );
  }

  public updateMember(
    id: Id,
    member: EditableMember,
    notifyMember: boolean,
  ): Observable<ApiResponse<Member>> {
    return this.http.put<ApiResponse<Member>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}/${id}`,
      member,
      { params: this.notifyParams(notifyMember) },
    );
  }

  public deleteMember(id: Id): Observable<ApiResponse<Id>> {
    return this.http.delete<ApiResponse<Id>>(
      `${this.API_BASE_URL}/admin/${this.COLLECTION}/${id}`,
    );
  }

  private notifyParams(notifyMember: boolean): HttpParams {
    return notifyMember ? new HttpParams().set('notify', 'true') : new HttpParams();
  }
}
