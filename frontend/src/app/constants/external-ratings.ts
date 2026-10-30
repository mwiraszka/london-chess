import { RatingPlatform, TimeControl } from '@app/models';

// Chess.com and Lichess rate the same time controls, so their ratings share columns
export const ONLINE_TIME_CONTROLS: TimeControl[] = ['rapid', 'blitz', 'bullet'];

// Each platform's time controls, in the order its ratings are shown
export const PLATFORM_TIME_CONTROLS: Record<RatingPlatform, TimeControl[]> = {
  fide: ['standard', 'rapid', 'blitz'],
  cfc: ['regular', 'quick'],
  chessCom: ONLINE_TIME_CONTROLS,
  lichess: ONLINE_TIME_CONTROLS,
};

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  standard: 'Standard',
  regular: 'Regular',
  rapid: 'Rapid',
  quick: 'Quick',
  blitz: 'Blitz',
  bullet: 'Bullet',
};
