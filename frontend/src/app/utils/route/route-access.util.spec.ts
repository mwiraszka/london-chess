import { Data } from '@angular/router';

import { User } from '@app/models';

import { declaredAccess, hasAccess, requiredAccess } from './route-access.util';

interface MockRoute {
  data: Data;
  firstChild: MockRoute | null;
}

describe('route access', () => {
  const admin: User = {
    id: 'user123',
    firstName: 'Ada',
    lastName: 'Byron',
    email: 'ada@example.com',
    isAdmin: true,
  };
  const nonAdmin: User = { ...admin, isAdmin: false };

  describe('declaredAccess', () => {
    it('should read a declared access level', () => {
      expect(declaredAccess({ access: 'admin' })).toBe('admin');
      expect(declaredAccess({ access: 'member' })).toBe('member');
    });

    it('should return null for anything it does not recognize', () => {
      expect(declaredAccess({})).toBeNull();
      expect(declaredAccess({ access: 'owner' })).toBeNull();
    });
  });

  describe('requiredAccess', () => {
    const state = (...levels: Array<string | null>) => {
      const root: MockRoute = { data: {}, firstChild: null };
      let route = root;

      for (const level of levels) {
        route.firstChild = { data: level ? { access: level } : {}, firstChild: null };
        route = route.firstChild;
      }

      return { root };
    };

    it('should return null when no route in the tree declares access', () => {
      expect(requiredAccess(state(null, null))).toBeNull();
    });

    it('should return the level declared deeper in the tree', () => {
      expect(requiredAccess(state(null, 'member'))).toBe('member');
    });

    it('should return the strictest level in the tree', () => {
      expect(requiredAccess(state('member', 'admin'))).toBe('admin');
      expect(requiredAccess(state('admin', 'member'))).toBe('admin');
    });
  });

  describe('hasAccess', () => {
    it('should allow anyone where no access is required', () => {
      expect(hasAccess(null, null)).toBe(true);
    });

    it('should require a user for a member route', () => {
      expect(hasAccess('member', null)).toBe(false);
      expect(hasAccess('member', nonAdmin)).toBe(true);
    });

    it('should require an admin for an admin route', () => {
      expect(hasAccess('admin', null)).toBe(false);
      expect(hasAccess('admin', nonAdmin)).toBe(false);
      expect(hasAccess('admin', admin)).toBe(true);
    });
  });
});
