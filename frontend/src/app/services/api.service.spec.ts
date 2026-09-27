import { TestBed } from '@angular/core/testing';

import { environment } from '@env';

import { ApiError, ApiService } from './api.service';
import { ClerkService } from './clerk.service';

describe('ApiService', () => {
  let service: ApiService;

  let fetchSpy: Mock<Promise<Response>, Parameters<typeof fetch>>;
  let getTokenSpy: Mock<Promise<string | null>>;

  const jsonResponse = (body: object, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const lastRequest = (): { url: string; init: RequestInit; headers: Headers } => {
    const [url, init = {}] = fetchSpy.mock.lastCall ?? [];
    return { url: String(url), init, headers: new Headers(init.headers) };
  };

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ data: { id: 1 } }));
    vi.stubGlobal('fetch', fetchSpy);
    getTokenSpy = vi.fn().mockResolvedValue('token-123');

    TestBed.configureTestingModule({
      providers: [{ provide: ClerkService, useValue: { getToken: getTokenSpy } }],
    });

    service = TestBed.inject(ApiService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('get', () => {
    it('should request the API url uncached with a bearer token and unwrap the data', async () => {
      const result = await service.get<{ id: number }>('/members');

      const { url, init, headers } = lastRequest();
      expect(url).toBe(`${environment.lccApiBaseUrl}/members`);
      expect(init.cache).toBe('no-store');
      expect(headers.get('Authorization')).toBe('Bearer token-123');
      expect(result).toEqual({ id: 1 });
    });

    it('should omit the authorization header when there is no session token', async () => {
      getTokenSpy.mockResolvedValue(null);

      await service.get('/members');

      expect(lastRequest().headers.has('Authorization')).toBe(false);
    });

    it('should return the whole body when it has no data envelope', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ ok: true }));

      const result = await service.get('/health');

      expect(result).toEqual({ ok: true });
    });

    it('should resolve undefined for an empty body', async () => {
      fetchSpy.mockResolvedValue(new Response('', { status: 200 }));

      const result = await service.get('/members');

      expect(result).toBeUndefined();
    });
  });

  describe('post', () => {
    it('should send an object body as JSON', async () => {
      await service.post('/members', { name: 'Ann' });

      const { init, headers } = lastRequest();
      expect(init.method).toBe('POST');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(init.body).toBe('{"name":"Ann"}');
    });

    it('should send a string body as is', async () => {
      await service.post('/members', '{"raw":true}');

      const { init, headers } = lastRequest();
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(init.body).toBe('{"raw":true}');
    });

    it('should send form data without a JSON content type', async () => {
      const formData = new FormData();

      await service.post('/images', formData);

      const { init, headers } = lastRequest();
      expect(init.body).toBe(formData);
      expect(headers.has('Content-Type')).toBe(false);
    });

    it('should send no body when none is given', async () => {
      await service.post('/members/1/approve');

      const { init, headers } = lastRequest();
      expect(init.body).toBeUndefined();
      expect(headers.has('Content-Type')).toBe(false);
    });
  });

  describe('patch', () => {
    it('should send an object body as JSON', async () => {
      await service.patch('/members/1', { city: 'London' });

      const { init, headers } = lastRequest();
      expect(init.method).toBe('PATCH');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(init.body).toBe('{"city":"London"}');
    });

    it('should send form data without a JSON content type', async () => {
      const formData = new FormData();

      await service.patch('/images/1', formData);

      const { init, headers } = lastRequest();
      expect(init.body).toBe(formData);
      expect(headers.has('Content-Type')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should resolve undefined for a no content response', async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await service.delete('/members/1');

      expect(lastRequest().init.method).toBe('DELETE');
      expect(result).toBeUndefined();
    });
  });

  describe('errors', () => {
    it('should throw an ApiError with the message and status from the response', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ message: 'Member not found.' }, 404));

      const request = service.get('/members/1');

      await expect(request).rejects.toThrow(ApiError);
      await expect(request).rejects.toMatchObject({
        message: 'Member not found.',
        status: 404,
      });
    });

    it('should fall back to a generic message when the error body is not JSON', async () => {
      fetchSpy.mockResolvedValue(new Response('Bad gateway', { status: 502 }));

      const request = service.get('/members');

      await expect(request).rejects.toMatchObject({
        message: 'Request failed (502).',
        status: 502,
      });
    });
  });
});
