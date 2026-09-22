import moment from 'moment-timezone';

import { isUpcomingEvent } from './is-upcoming-event.util';

describe('isUpcomingEvent', () => {
  it('should count an event as upcoming until three hours after it starts', () => {
    const now = moment.tz('America/Toronto');

    expect(isUpcomingEvent({ eventDate: now.clone().add(1, 'day').toISOString() })).toBe(
      true,
    );
    expect(
      isUpcomingEvent({ eventDate: now.clone().subtract(2, 'hours').toISOString() }),
    ).toBe(true);
    expect(
      isUpcomingEvent({ eventDate: now.clone().subtract(4, 'hours').toISOString() }),
    ).toBe(false);
  });
});
