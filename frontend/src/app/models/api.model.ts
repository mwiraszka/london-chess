export type ApiScope = 'public' | 'admin';

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedItems<T> {
  items: T[];
  filteredCount: number;
  totalCount: number;
}
