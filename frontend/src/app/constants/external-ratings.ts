import { RatingPlatform, TimeControl } from '@app/models';

// Each platform's time controls, in the order its ratings are shown
export const PLATFORM_TIME_CONTROLS: Record<RatingPlatform, TimeControl[]> = {
  fide: ['standard', 'rapid', 'blitz'],
  cfc: ['regular', 'quick'],
  chessCom: ['rapid', 'blitz', 'bullet'],
  lichess: ['rapid', 'blitz', 'bullet'],
};

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  standard: 'Standard',
  regular: 'Regular',
  rapid: 'Rapid',
  quick: 'Quick',
  blitz: 'Blitz',
  bullet: 'Bullet',
};
