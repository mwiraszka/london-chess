import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiResponse, Dataset } from '@app/models';

import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class DatasetApiService {
  private readonly http = inject(HttpClient);

  private readonly API_BASE_URL = environment.lccApiBaseUrl;

  public getDataset(): Observable<ApiResponse<Dataset>> {
    return this.http.get<ApiResponse<Dataset>>(`${this.API_BASE_URL}/dataset`);
  }
}
