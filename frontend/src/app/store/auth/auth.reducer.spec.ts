import { User } from '@app/models';

import * as AuthActions from './auth.actions';
import { authReducer, initialState } from './auth.reducer';

describe('Auth Reducer', () => {
  const mockUser: User = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isAdmin: true,
  };

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };

      const state = authReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({ user: null });
    });
  });

  describe('userChanged', () => {
    it('should set the user', () => {
      const action = AuthActions.userChanged({ user: mockUser });

      const state = authReducer(initialState, action);

      expect(state.user).toEqual(mockUser);
    });

    it('should clear the user on logout', () => {
      const previousState = { user: mockUser };

      const state = authReducer(previousState, AuthActions.userChanged({ user: null }));

      expect(state.user).toBeNull();
    });

    it('should not mutate the previous state', () => {
      const previousState = { user: mockUser };
      const originalState = { ...previousState };

      const state = authReducer(previousState, AuthActions.userChanged({ user: null }));

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
    });
  });
});
