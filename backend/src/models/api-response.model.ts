export interface ApiFullSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiPaginatedSuccessResponse<T> {
  data: {
    items: T[];
    filteredCount: number;
    totalCount: number;
  };
  message?: string;
}

export interface ApiErrorResponse {
  message: string;
}

export type ApiPaginatedResponse<T> = ApiPaginatedSuccessResponse<T> | ApiErrorResponse;

export type ApiResponse<T> = ApiFullSuccessResponse<T> | ApiErrorResponse;
