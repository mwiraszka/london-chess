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

  describe('selectIsAdmin', () => {
    it('should return true when user is admin', () => {
      const result = AuthSelectors.selectIsAdmin.projector(mockAuthState);

      expect(result).toBe(true);
    });

    it('should return false when user is not admin', () => {
      const state: AuthState = {
        user: { ...mockUser, isAdmin: false },
      };

      const result = AuthSelectors.selectIsAdmin.projector(state);

      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      const result = AuthSelectors.selectIsAdmin.projector({ user: null });

      expect(result).toBe(false);
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

  describe('selectUserId', () => {
    it('should select the user id', () => {
      const result = AuthSelectors.selectUserId.projector(mockUser);

      expect(result).toBe('user-123');
    });

    it('should return undefined when user is null', () => {
      const result = AuthSelectors.selectUserId.projector(null);

      expect(result).toBeUndefined();
    });
  });
});
