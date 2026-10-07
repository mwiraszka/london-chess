import { User } from '@app/models';

import { AuthState } from './auth.reducer';
import * as AuthSelectors from './auth.selectors';

describe('Auth Selectors', () => {
  const mockUser: User = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'admin@example.com',
    isAdmin: true,
    memberNumber: null,
  };

  const mockAuthState: AuthState = {
    user: mockUser,
  };

  describe('selectAuthState', () => {
    it('should select the auth state', () => {
      const state = {
        authState: mockAuthState,
      };

      const result = AuthSelectors.selectAuthState(state as { authState: AuthState });

      expect(result).toEqual(mockAuthState);
    });
  });

  describe('selectHasAdminRights', () => {
    it('should return true when user is admin', () => {
      const result = AuthSelectors.selectHasAdminRights.projector(mockAuthState);

      expect(result).toBe(true);
    });

    it('should return false when user is not admin', () => {
      const state: AuthState = {
        user: { ...mockUser, isAdmin: false },
      };

      const result = AuthSelectors.selectHasAdminRights.projector(state);

      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      const result = AuthSelectors.selectHasAdminRights.projector({ user: null });

      expect(result).toBe(false);
    });
  });

  describe('selectIsAdmin', () => {
    it('should treat an admin as one while their controls are shown', () => {
      const result = AuthSelectors.selectIsAdmin.projector(true, true);

      expect(result).toBe(true);
    });

    it('should treat an admin with their controls switched off as any other member', () => {
      const result = AuthSelectors.selectIsAdmin.projector(true, false);

      expect(result).toBe(false);
    });

    it('should never treat anyone else as an admin', () => {
      const result = AuthSelectors.selectIsAdmin.projector(false, true);

      expect(result).toBe(false);
    });
  });

  describe('selectApiScope', () => {
    it('should use the admin API for admins', () => {
      const result = AuthSelectors.selectApiScope.projector(true);

      expect(result).toBe('admin');
    });

    it('should use the public API for everyone else', () => {
      const result = AuthSelectors.selectApiScope.projector(false);

      expect(result).toBe('public');
    });
  });

  describe('selectUser', () => {
    it('should select the user', () => {
      const result = AuthSelectors.selectUser.projector(mockAuthState);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user is null', () => {
      const result = AuthSelectors.selectUser.projector({ user: null });

      expect(result).toBeNull();
    });
  });
});
