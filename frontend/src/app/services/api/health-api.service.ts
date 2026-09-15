import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiResponse } from '@app/models';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class HealthApiService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE_URL = environment.lccApiBaseUrl;

  public getVersion(): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.API_BASE_URL}/version`);
  }
}
