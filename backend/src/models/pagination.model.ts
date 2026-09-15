import { QueryFilter } from 'mongoose';

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, boolean | object>;
  search: string;
}

export interface PaginationQuery<T = unknown> {
  skip: number;
  limit?: number;
  sort: Record<string, 1 | -1>;
  filter: QueryFilter<T>;
}

export interface SortingConfig {
  fieldMappings?: Record<string, string>;
  secondarySort?: Record<string, string>;
  searchableFields: string[];
}
