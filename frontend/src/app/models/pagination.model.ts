import { EntityType } from './entity.model';
import { Event } from './event.model';
import { Member } from './member.model';

export interface Filter {
  label: string;
  value: boolean;
}

type MemberFilters = {
  showInactiveMembers: Filter;
};

type EventFilters = {
  showPastEvents: Filter;
};

export interface DataPaginationOptions<T = EntityType> {
  page: number;
  pageSize: number;
  sortBy: keyof T;
  sortOrder: 'asc' | 'desc';
  filters: T extends Member ? MemberFilters : T extends Event ? EventFilters : null;
  search: string;
}
