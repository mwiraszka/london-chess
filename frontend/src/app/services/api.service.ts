import { firstValueFrom } from 'rxjs';

import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { REQUEST_TIMEOUT } from '@app/constants/http';
import { parseError } from '@app/utils/error/parse-error.util';

import { environment } from '@env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  data: T;
}

export interface ApiRequestOptions {
  timeoutMs?: number;
}

// Answers in the API's data envelope, through the same interceptors as the store's requests
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const context = new HttpContext();
    if (options.timeoutMs) {
      context.set(REQUEST_TIMEOUT, options.timeoutMs);
    }

    try {
      const { data } = await firstValueFrom(
        this.http.request<ApiEnvelope<T>>(method, `${environment.lccApiBaseUrl}${path}`, {
          body,
          context,
        }),
      );
      return data;
    } catch (error) {
      throw error instanceof HttpErrorResponse
        ? new ApiError(parseError(error).message, error.status)
        : error;
    }
  }
}
