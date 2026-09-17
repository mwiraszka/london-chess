import { AppState } from './app.reducer';
import * as AppSelectors from './app.selectors';

describe('App Selectors', () => {
  const mockAppState: AppState = {
    isDarkMode: true,
    isSafeMode: false,
    isDesktopView: false,
    isWideView: false,
    bannerLastCleared: '2025-01-15T10:30:00.000Z',
    showUpcomingEventBanner: false,
  };

  describe('selectAppState', () => {
    it('should select the app state', () => {
      const state = {
        appState: mockAppState,
      };

      const result = AppSelectors.selectAppState(state as { appState: AppState });

      expect(result).toEqual(mockAppState);
    });
  });

  describe('selectIsDarkMode', () => {
    it('should select isDarkMode when true', () => {
      const result = AppSelectors.selectIsDarkMode.projector(mockAppState);

      expect(result).toBe(true);
    });

    it('should select isDarkMode when false', () => {
      const state: AppState = {
        ...mockAppState,
        isDarkMode: false,
      };

      const result = AppSelectors.selectIsDarkMode.projector(state);

      expect(result).toBe(false);
    });
  });

  describe('selectIsSafeMode', () => {
    it('should select isSafeMode when false', () => {
      const result = AppSelectors.selectIsSafeMode.projector(mockAppState);

      expect(result).toBe(false);
    });

    it('should select isSafeMode when true', () => {
      const state: AppState = {
        ...mockAppState,
        isSafeMode: true,
      };

      const result = AppSelectors.selectIsSafeMode.projector(state);

      expect(result).toBe(true);
    });
  });

  describe('selectShowUpcomingEventBanner', () => {
    it('should select showUpcomingEventBanner when false', () => {
      const result = AppSelectors.selectShowUpcomingEventBanner.projector(mockAppState);

      expect(result).toBe(false);
    });

    it('should select showUpcomingEventBanner when true', () => {
      const state: AppState = {
        ...mockAppState,
        showUpcomingEventBanner: true,
      };

      const result = AppSelectors.selectShowUpcomingEventBanner.projector(state);

      expect(result).toBe(true);
    });
  });

  describe('selectBannerLastCleared', () => {
    it('should select bannerLastCleared when it has a value', () => {
      const result = AppSelectors.selectBannerLastCleared.projector(mockAppState);

      expect(result).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should select bannerLastCleared when it is null', () => {
      const state: AppState = {
        ...mockAppState,
        bannerLastCleared: null,
      };

      const result = AppSelectors.selectBannerLastCleared.projector(state);

      expect(result).toBeNull();
    });
  });

  describe('selectIsDesktopView', () => {
    it('should select isDesktopView when false', () => {
      const result = AppSelectors.selectIsDesktopView.projector(mockAppState);

      expect(result).toBe(false);
    });

    it('should select isDesktopView when true', () => {
      const state: AppState = {
        ...mockAppState,
        isDesktopView: true,
      };

      const result = AppSelectors.selectIsDesktopView.projector(state);

      expect(result).toBe(true);
    });
  });
  describe('selectIsWideView', () => {
    it('should return the isWideView state', () => {
      const result = AppSelectors.selectIsWideView.projector(mockAppState);

      expect(result).toBe(false);
    });

    it('should return true when isWideView is true', () => {
      const state: AppState = {
        ...mockAppState,
        isWideView: true,
      };

      const result = AppSelectors.selectIsWideView.projector(state);

      expect(result).toBe(true);
    });
  });
});
