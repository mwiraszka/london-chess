import { Request } from 'express';
import { QueryFilter } from 'mongoose';

import {
  PaginationParams,
  PaginationQuery,
  SortingConfig,
} from '../models/pagination.model';

export function parsePaginationParams(req: Request): PaginationParams {
  const filters: Record<string, boolean | object> = {};

  Object.keys(req.query).forEach(key => {
    if (!key.startsWith('filter_')) return;
    const filter = key.replace('filter_', '');

    if (filter === 'showInactiveMembers' && req.query[key] === 'false') {
      filters['isActive'] = true;
    }

    if (filter === 'showPastEvents' && req.query[key] === 'false') {
      filters['eventDate'] = { $gt: new Date().toISOString() };
    }
  });

  return {
    page: parseInt(req.query['page'] as string) || 1,
    pageSize: parseInt(req.query['pageSize'] as string) || -1,
    sortBy: (req.query['sortBy'] as string) || 'id',
    sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'asc',
    search: (req.query['search'] as string) || '',
    filters,
  };
}

export function buildPaginationQuery<T = unknown>(
  params: PaginationParams,
  config?: SortingConfig,
): PaginationQuery<T> {
  const { page, pageSize, sortBy, sortOrder, search, filters } = params;

  // pageSize of -1 denotes no pagination, so return all items
  const skip = pageSize === -1 ? 0 : (page - 1) * pageSize;

  const sort: Record<string, 1 | -1> = {};

  const actualSortField = config?.fieldMappings?.[sortBy] || sortBy;
  sort[actualSortField] = sortOrder === 'asc' ? 1 : -1;

  if (config?.secondarySort?.[sortBy]) {
    sort[config.secondarySort[sortBy]] = sortOrder === 'asc' ? 1 : -1;
  }

  const filter: QueryFilter<T> = {};

  // Add global search filter
  if (search.trim() && config?.searchableFields?.length) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    const orConditions: unknown[] = config.searchableFields.map(field => ({
      [field]: searchRegex,
    }));

    // If both firstName and lastName are searchable, also search combinations
    if (
      config.searchableFields.includes('firstName') &&
      config.searchableFields.includes('lastName')
    ) {
      orConditions.push({
        $expr: {
          $regexMatch: {
            input: { $concat: ['$firstName', ' ', '$lastName'] },
            regex: search.trim(),
            options: 'i',
          },
        },
      });

      orConditions.push({
        $expr: {
          $regexMatch: {
            input: { $concat: ['$lastName', ', ', '$firstName'] },
            regex: search.trim(),
            options: 'i',
          },
        },
      });

      orConditions.push({
        $expr: {
          $regexMatch: {
            input: { $concat: ['$lastName', ' ', '$firstName'] },
            regex: search.trim(),
            options: 'i',
          },
        },
      });
    }

    Object.assign(filter, { $or: orConditions });
  }

  Object.assign(filter, filters);

  return {
    skip,
    limit: pageSize === -1 ? undefined : pageSize,
    sort,
    filter,
  };
}
