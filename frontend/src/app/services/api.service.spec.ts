import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { REQUEST_TIMEOUT, REQUEST_TIMEOUT_MS } from '@app/constants/http';

import { environment } from '@env';

import { ApiError, ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const url = (path: string) => `${environment.lccApiBaseUrl}${path}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should get from the API and unwrap the data', async () => {
    const result = service.get<{ id: number }>('/members');

    const request = httpMock.expectOne(url('/members'));
    request.flush({ data: { id: 1 } });

    expect(request.request.method).toBe('GET');
    expect(await result).toEqual({ id: 1 });
  });

  it.each([
    ['post', (body: unknown) => service.post('/users/me/password', body), 'POST'],
    ['patch', (body: unknown) => service.patch('/users/me', body), 'PATCH'],
  ])('should %s the body as it is given', async (_, send, method) => {
    const body = { showYearOfBirth: true };
    const form = new FormData();
    const sent = [send(body), send(form)];

    const [json, multipart] = httpMock.match(() => true);
    json.flush({ data: 'success' });
    multipart.flush({ data: 'success' });

    expect(json.request.method).toBe(method);
    expect(json.request.body).toBe(body);
    expect(multipart.request.body).toBe(form);
    expect(await Promise.all(sent)).toEqual(['success', 'success']);
  });

  it('should delete through the API', async () => {
    const result = service.delete<string>('/users/me');

    const request = httpMock.expectOne(url('/users/me'));
    request.flush({ data: 'success' });

    expect(request.request.method).toBe('DELETE');
    expect(await result).toBe('success');
  });

  it('should allow a longer wait when asked to, and the usual one otherwise', () => {
    void service.post('/users/me/avatar', new FormData(), { timeoutMs: 120_000 });
    void service.get('/users/me');

    const [upload, read] = httpMock.match(() => true);

    expect(upload.request.context.get(REQUEST_TIMEOUT)).toBe(120_000);
    expect(read.request.context.get(REQUEST_TIMEOUT)).toBe(REQUEST_TIMEOUT_MS);
    upload.flush({ data: null });
    read.flush({ data: null });
  });

  it("should throw an ApiError carrying the API's message and status", async () => {
    const result = service.delete('/users/me');

    httpMock
      .expectOne(url('/users/me'))
      .flush({ message: 'Account not found.' }, { status: 404, statusText: 'Not Found' });

    await expect(result).rejects.toEqual(new ApiError('Account not found.', 404));
  });

  it('should explain a failure whose answer has no message', async () => {
    const result = service.get('/users/me');

    httpMock
      .expectOne(url('/users/me'))
      .flush(null, { status: 502, statusText: 'Bad Gateway' });

    await expect(result).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('502'),
    });
  });
});
