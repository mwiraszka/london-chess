import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiResponse, Dataset } from '@app/models';

import { environment } from '@env';

import { DatasetApiService } from './dataset-api.service';

describe('DatasetApiService', () => {
  let service: DatasetApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DatasetApiService, provideHttpClientTesting()],
    });

    service = TestBed.inject(DatasetApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get when the database was last replaced', () => {
    const response: ApiResponse<Dataset> = {
      data: { replacedAt: '2026-10-11T08:00:00.000Z' },
    };
    let result: ApiResponse<Dataset> | undefined;

    service.getDataset().subscribe(data => (result = data));
    const req = httpMock.expectOne(`${environment.lccApiBaseUrl}/dataset`);
    req.flush(response);

    expect(req.request.method).toBe('GET');
    expect(result).toEqual(response);
  });
});
