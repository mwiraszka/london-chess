import { describeScheduleChange } from './schedule-changes.util';

describe('describeScheduleChange', () => {
  const NOW = new Date('2026-09-26T12:00:00.000Z');
  const event = {
    eventDate: '2026-10-01T23:00:00.000Z',
    title: 'Blitz night',
    type: 'blitz tournament (10 mins)',
  };

  it('should describe a rescheduled event in club time', () => {
    const change = describeScheduleChange(
      event,
      { ...event, eventDate: '2026-10-08T23:00:00.000Z' },
      NOW,
    );

    expect(change?.kind).toBe('changed');
    expect(change?.type).toBe('Blitz tournament (10 mins)');
    expect(change?.rows).toEqual([
      {
        label: 'Date and time',
        before: expect.stringContaining('October 1, 2026'),
        after: expect.stringContaining('October 8, 2026'),
      },
    ]);
    expect(change?.rows[0].before).toContain('7:00');
  });

  it('should leave out events that have already happened', () => {
    const past = { ...event, eventDate: '2026-09-01T23:00:00.000Z' };

    const added = describeScheduleChange(null, past, NOW);
    const removed = describeScheduleChange(past, null, NOW);

    expect(added).toBeNull();
    expect(removed).toBeNull();
  });

  it('should find nothing to tell when none of the scheduled fields changed', () => {
    const change = describeScheduleChange(event, { ...event }, NOW);

    expect(change).toBeNull();
  });
});
