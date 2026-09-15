import * as navActions from './nav.actions';
import { NavState, initialState, navReducer } from './nav.reducer';

describe('Nav Reducer', () => {
  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = navReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have an empty pathHistory', () => {
      expect(initialState).toEqual({
        pathHistory: [],
      });
    });
  });

  describe('appendPathToHistory', () => {
    it('should add a new path to empty history', () => {
      const path = '/articles';
      const action = navActions.appendPathToHistory({ path });
      const state = navReducer(initialState, action);

      expect(state.pathHistory).toEqual(['/articles']);
    });

    it('should append multiple paths in order', () => {
      const firstState = navReducer(
        initialState,
        navActions.appendPathToHistory({ path: '/articles' }),
      );
      const secondState = navReducer(
        firstState,
        navActions.appendPathToHistory({ path: '/events' }),
      );
      const thirdState = navReducer(
        secondState,
        navActions.appendPathToHistory({ path: '/members' }),
      );

      expect(thirdState.pathHistory).toEqual(['/articles', '/events', '/members']);
    });

    it('should not add duplicate consecutive paths', () => {
      const firstState = navReducer(
        initialState,
        navActions.appendPathToHistory({ path: '/articles' }),
      );
      const secondState = navReducer(
        firstState,
        navActions.appendPathToHistory({ path: '/articles' }),
      );

      expect(secondState.pathHistory).toEqual(['/articles']);
    });

    it('should allow the same path after a different path', () => {
      const firstState = navReducer(
        initialState,
        navActions.appendPathToHistory({ path: '/articles' }),
      );
      const secondState = navReducer(
        firstState,
        navActions.appendPathToHistory({ path: '/events' }),
      );
      const thirdState = navReducer(
        secondState,
        navActions.appendPathToHistory({ path: '/articles' }),
      );

      expect(thirdState.pathHistory).toEqual(['/articles', '/events', '/articles']);
    });

    it('should limit history to the last 5 paths', () => {
      let state = initialState;

      // Add 6 paths
      state = navReducer(state, navActions.appendPathToHistory({ path: '/path1' }));
      state = navReducer(state, navActions.appendPathToHistory({ path: '/path2' }));
      state = navReducer(state, navActions.appendPathToHistory({ path: '/path3' }));
      state = navReducer(state, navActions.appendPathToHistory({ path: '/path4' }));
      state = navReducer(state, navActions.appendPathToHistory({ path: '/path5' }));
      state = navReducer(state, navActions.appendPathToHistory({ path: '/path6' }));

      expect(state.pathHistory).toEqual([
        '/path2',
        '/path3',
        '/path4',
        '/path5',
        '/path6',
      ]);
      expect(state.pathHistory.length).toBe(5);
    });

    it('should limit history to 5 even with many consecutive additions', () => {
      let state = initialState;

      // Add 10 unique paths
      for (let i = 1; i <= 10; i++) {
        state = navReducer(state, navActions.appendPathToHistory({ path: `/path${i}` }));
      }

      expect(state.pathHistory).toEqual([
        '/path6',
        '/path7',
        '/path8',
        '/path9',
        '/path10',
      ]);
      expect(state.pathHistory.length).toBe(5);
    });

    it('should handle paths with query parameters', () => {
      const path = '/articles?page=2&sort=desc';
      const action = navActions.appendPathToHistory({ path });
      const state = navReducer(initialState, action);

      expect(state.pathHistory).toEqual(['/articles?page=2&sort=desc']);
    });

    it('should handle root path', () => {
      const action = navActions.appendPathToHistory({ path: '/' });
      const state = navReducer(initialState, action);

      expect(state.pathHistory).toEqual(['/']);
    });
  });

  describe('state immutability', () => {
    it('should not mutate the previous state', () => {
      const previousState: NavState = {
        pathHistory: ['/articles', '/events'],
      };
      const originalState = {
        ...previousState,
        pathHistory: [...previousState.pathHistory],
      };

      const action = navActions.appendPathToHistory({ path: '/members' });
      const state = navReducer(previousState, action);

      expect(previousState).toEqual(originalState);
      expect(state).not.toBe(previousState);
      expect(state.pathHistory).not.toBe(previousState.pathHistory);
    });
  });
});
