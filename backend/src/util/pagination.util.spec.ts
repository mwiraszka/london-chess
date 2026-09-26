import express from 'express';
import request from 'supertest';

import { PaginationParams } from '../models/pagination.model';
import { buildPaginationQuery, parsePaginationParams } from './pagination.util';

const nameMatch = (fields: string[], separator: string, regex: string) => ({
  $expr: {
    $regexMatch: {
      input: { $concat: [`$${fields[0]}`, separator, `$${fields[1]}`] },
      regex,
      options: 'i',
    },
  },
});

describe('buildPaginationQuery', () => {
  describe('search', () => {
    const baseParams: PaginationParams = {
      page: 1,
      pageSize: 20,
      sortBy: 'id',
      sortOrder: 'desc',
      search: '',
      filters: {},
    };

    const configWithNames = {
      searchableFields: ['firstName', 'lastName', 'city'],
    };

    it('should also match full names in either order when both name fields are searchable', () => {
      const params: PaginationParams = { ...baseParams, search: 'John Doe' };

      const result = buildPaginationQuery(params, configWithNames);

      expect(result.filter).toEqual({
        $or: [
          { firstName: { $regex: 'John Doe', $options: 'i' } },
          { lastName: { $regex: 'John Doe', $options: 'i' } },
          { city: { $regex: 'John Doe', $options: 'i' } },
          nameMatch(['firstName', 'lastName'], ' ', 'John Doe'),
          nameMatch(['lastName', 'firstName'], ', ', 'John Doe'),
          nameMatch(['lastName', 'firstName'], ' ', 'John Doe'),
        ],
      });
    });

    it('should match only the searchable fields when a name field is missing', () => {
      const params: PaginationParams = { ...baseParams, search: 'Doe' };

      const onlyFirstName = buildPaginationQuery(params, {
        searchableFields: ['firstName', 'city'],
      });
      const onlyLastName = buildPaginationQuery(params, {
        searchableFields: ['lastName', 'email'],
      });

      expect(onlyFirstName.filter).toEqual({
        $or: [
          { firstName: { $regex: 'Doe', $options: 'i' } },
          { city: { $regex: 'Doe', $options: 'i' } },
        ],
      });
      expect(onlyLastName.filter).toEqual({
        $or: [
          { lastName: { $regex: 'Doe', $options: 'i' } },
          { email: { $regex: 'Doe', $options: 'i' } },
        ],
      });
    });

    it('should not filter on an empty or blank search', () => {
      const empty = buildPaginationQuery({ ...baseParams, search: '' }, configWithNames);
      const blank = buildPaginationQuery(
        { ...baseParams, search: '   ' },
        configWithNames,
      );

      expect(empty.filter).toEqual({});
      expect(blank.filter).toEqual({});
    });

    it('should match regex characters in the search literally', () => {
      const params: PaginationParams = { ...baseParams, search: 'a.b (c) \\' };

      const result = buildPaginationQuery(params, { searchableFields: ['city'] });

      expect(result.filter).toEqual({
        $or: [{ city: { $regex: 'a\\.b \\(c\\) \\\\', $options: 'i' } }],
      });
    });

    it('should pass through pre-parsed filters in addition to search', () => {
      const params: PaginationParams = {
        ...baseParams,
        search: 'London',
        filters: { isActive: true },
      };

      const result = buildPaginationQuery(params, { searchableFields: ['city'] });

      expect(result.filter).toEqual({
        $or: [{ city: { $regex: 'London', $options: 'i' } }],
        isActive: true,
      });
    });
  });

  describe('paging and sorting', () => {
    it('should skip the earlier pages', () => {
      const params: PaginationParams = {
        page: 3,
        pageSize: 10,
        sortBy: 'id',
        sortOrder: 'asc',
        search: '',
        filters: {},
      };

      const result = buildPaginationQuery(params);

      expect(result.skip).toBe(20);
      expect(result.limit).toBe(10);
    });

    it('should return everything when there is no page size', () => {
      const params: PaginationParams = {
        page: 3,
        pageSize: -1,
        sortBy: 'id',
        sortOrder: 'asc',
        search: '',
        filters: {},
      };

      const result = buildPaginationQuery(params);

      expect(result.skip).toBe(0);
      expect(result.limit).toBeUndefined();
    });

    it('should sort by the mapped field and then by its secondary field', () => {
      const params: PaginationParams = {
        page: 1,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'desc',
        search: '',
        filters: {},
      };
      const config = {
        fieldMappings: { name: 'lastName' },
        secondarySort: { name: 'firstName' },
        searchableFields: [],
      };

      const result = buildPaginationQuery(params, config);

      expect(result.sort).toEqual({ lastName: -1, firstName: -1 });
    });
  });
});

describe('parsePaginationParams', () => {
  const app = express().get('/', (req, res) => {
    res.json(parsePaginationParams(req));
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should read the page, sorting, search and known filters from the query', async () => {
    const response = await request(app).get('/').query({
      page: '2',
      pageSize: '25',
      sortBy: 'rating',
      sortOrder: 'desc',
      search: 'Doe',
      filter_showInactiveMembers: 'false',
      filter_showPastEvents: 'false',
      filter_unknown: 'false',
    });

    expect(response.body).toEqual({
      page: 2,
      pageSize: 25,
      sortBy: 'rating',
      sortOrder: 'desc',
      search: 'Doe',
      filters: {
        isActive: true,
        eventDate: { $gt: '2026-09-26T12:00:00.000Z' },
      },
    });
  });

  it('should default to every item in ascending id order', async () => {
    const response = await request(app).get('/?filter_showInactiveMembers=true');

    expect(response.body).toEqual({
      page: 1,
      pageSize: -1,
      sortBy: 'id',
      sortOrder: 'asc',
      search: '',
      filters: {},
    });
  });
});
