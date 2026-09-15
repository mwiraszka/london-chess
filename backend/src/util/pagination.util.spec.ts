import { PaginationParams } from '../models/pagination.model';
import { buildPaginationQuery } from './pagination.util';

describe('buildPaginationQuery', () => {
  describe('name combination search', () => {
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

    it('should add name combination conditions when both firstName and lastName are searchable', () => {
      const params: PaginationParams = { ...baseParams, search: 'John Doe' };

      const result = buildPaginationQuery(params, configWithNames);

      expect(result.filter.$or).toHaveLength(6);

      const orConditions = result.filter.$or as Record<string, unknown>[];

      expect(orConditions).toContainEqual({
        firstName: { $regex: 'John Doe', $options: 'i' },
      });
      expect(orConditions).toContainEqual({
        lastName: { $regex: 'John Doe', $options: 'i' },
      });
      expect(orConditions).toContainEqual({
        city: { $regex: 'John Doe', $options: 'i' },
      });

      const exprConditions = orConditions.filter(cond => cond['$expr']);
      expect(exprConditions).toHaveLength(3);

      const concatInputs = exprConditions.map(cond => {
        const expr = cond['$expr'] as { $regexMatch: { input: { $concat: string[] } } };
        return expr.$regexMatch.input.$concat;
      });
      expect(concatInputs).toContainEqual(['$firstName', ' ', '$lastName']);
      expect(concatInputs).toContainEqual(['$lastName', ', ', '$firstName']);
      expect(concatInputs).toContainEqual(['$lastName', ' ', '$firstName']);
    });

    it('should not add name combinations when only firstName is searchable', () => {
      const configOnlyFirstName = {
        searchableFields: ['firstName', 'city'],
      };
      const params: PaginationParams = { ...baseParams, search: 'John' };

      const result = buildPaginationQuery(params, configOnlyFirstName);

      expect(result.filter.$or).toHaveLength(2);

      const orConditions = result.filter.$or as Record<string, unknown>[];
      expect(orConditions).toContainEqual({
        firstName: { $regex: 'John', $options: 'i' },
      });
      expect(orConditions).toContainEqual({ city: { $regex: 'John', $options: 'i' } });

      const exprConditions = orConditions.filter(cond => cond['$expr']);
      expect(exprConditions).toHaveLength(0);
    });

    it('should not add name combinations when only lastName is searchable', () => {
      const configOnlyLastName = {
        searchableFields: ['lastName', 'email'],
      };
      const params: PaginationParams = { ...baseParams, search: 'Doe' };

      const result = buildPaginationQuery(params, configOnlyLastName);

      expect(result.filter.$or).toHaveLength(2);

      const orConditions = result.filter.$or as Record<string, unknown>[];
      expect(orConditions).toContainEqual({ lastName: { $regex: 'Doe', $options: 'i' } });
      expect(orConditions).toContainEqual({ email: { $regex: 'Doe', $options: 'i' } });

      const exprConditions = orConditions.filter(cond => cond['$expr']);
      expect(exprConditions).toHaveLength(0);
    });

    it('should handle empty search string', () => {
      const params: PaginationParams = { ...baseParams, search: '' };

      const result = buildPaginationQuery(params, configWithNames);

      expect(result.filter.$or).toBeUndefined();
    });

    it('should handle whitespace-only search string', () => {
      const params: PaginationParams = { ...baseParams, search: '   ' };

      const result = buildPaginationQuery(params, configWithNames);

      expect(result.filter.$or).toBeUndefined();
    });

    it('should pass through pre-parsed filters in addition to search', () => {
      const params: PaginationParams = {
        ...baseParams,
        search: 'John Doe',
        filters: { isActive: true },
      };

      const result = buildPaginationQuery(params, configWithNames);

      expect(result.filter.$or).toHaveLength(6);
      expect(result.filter['isActive']).toBe(true);
    });
  });

  describe('existing functionality', () => {
    it('should handle pagination correctly', () => {
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

    it('should handle sorting with field mappings', () => {
      const params: PaginationParams = {
        page: 1,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc',
        search: '',
        filters: {},
      };

      const config = {
        fieldMappings: {
          name: 'lastName',
        },
        secondarySort: {
          name: 'firstName',
        },
        searchableFields: [],
      };

      const result = buildPaginationQuery(params, config);

      expect(result.sort).toEqual({
        lastName: 1,
        firstName: 1,
      });
    });
  });
});
