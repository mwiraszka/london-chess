import { Injectable, inject } from '@angular/core';

import { environment } from '@env';

import { ClerkService } from './clerk.service';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly clerk = inject(ClerkService);

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body?: BodyInit | unknown): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(path, {
      method: 'POST',
      ...(isFormData || !body
        ? { body: body as BodyInit }
        : {
            headers: { 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? body : JSON.stringify(body),
          }),
    });
  }

  async patch<T>(path: string, body: BodyInit | unknown): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(path, {
      method: 'PATCH',
      ...(isFormData
        ? { body }
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.clerk.getToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${environment.lccApiBaseUrl}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
      throw new ApiError(
        error?.message ?? `Request failed (${response.status}).`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    const envelope = (text ? JSON.parse(text) : undefined) as ApiEnvelope<T> | undefined;
    return (envelope?.data ?? envelope) as T;
  }
}
