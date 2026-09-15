import { NavState } from './nav.reducer';
import * as NavSelectors from './nav.selectors';

describe('Nav Selectors', () => {
  const mockNavState: NavState = {
    pathHistory: ['/home', '/about', '/members'],
  };

  describe('selectNavState', () => {
    it('should select the nav state', () => {
      const state = {
        navState: mockNavState,
      };

      const result = NavSelectors.selectNavState(state as { navState: NavState });

      expect(result).toEqual(mockNavState);
    });
  });

  describe('selectPathHistory', () => {
    it('should select the path history', () => {
      const result = NavSelectors.selectPathHistory.projector(mockNavState);

      expect(result).toEqual(['/home', '/about', '/members']);
    });

    it('should return empty array when path history is empty', () => {
      const state: NavState = {
        pathHistory: [],
      };

      const result = NavSelectors.selectPathHistory.projector(state);

      expect(result).toEqual([]);
    });
  });

  describe('selectCurrentPath', () => {
    it('should select the current path (last in history)', () => {
      const pathHistory = ['/home', '/about', '/members'];

      const result = NavSelectors.selectCurrentPath.projector(pathHistory);

      expect(result).toBe('/members');
    });

    it('should return null when path history is empty', () => {
      const pathHistory: string[] = [];

      const result = NavSelectors.selectCurrentPath.projector(pathHistory);

      expect(result).toBeNull();
    });

    it('should return the only path when history has one item', () => {
      const pathHistory = ['/home'];

      const result = NavSelectors.selectCurrentPath.projector(pathHistory);

      expect(result).toBe('/home');
    });
  });

  describe('router selectors', () => {
    it('should export selectCurrentRoute', () => {
      expect(NavSelectors.selectCurrentRoute).toBeDefined();
    });

    it('should export selectFragment', () => {
      expect(NavSelectors.selectFragment).toBeDefined();
    });

    it('should export selectQueryParams', () => {
      expect(NavSelectors.selectQueryParams).toBeDefined();
    });

    it('should export selectQueryParam', () => {
      expect(NavSelectors.selectQueryParam).toBeDefined();
    });

    it('should export selectRouteParams', () => {
      expect(NavSelectors.selectRouteParams).toBeDefined();
    });

    it('should export selectRouteParam', () => {
      expect(NavSelectors.selectRouteParam).toBeDefined();
    });

    it('should export selectRouteData', () => {
      expect(NavSelectors.selectRouteData).toBeDefined();
    });

    it('should export selectRouteDataParam', () => {
      expect(NavSelectors.selectRouteDataParam).toBeDefined();
    });

    it('should export selectUrl', () => {
      expect(NavSelectors.selectUrl).toBeDefined();
    });

    it('should export selectTitle', () => {
      expect(NavSelectors.selectTitle).toBeDefined();
    });
  });
});
