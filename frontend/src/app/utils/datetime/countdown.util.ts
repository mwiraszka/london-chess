const UNITS = [
  { unit: 'd', name: 'day', seconds: 86_400 },
  { unit: 'h', name: 'hour', seconds: 3_600 },
  { unit: 'm', name: 'minute', seconds: 60 },
  { unit: 's', name: 'second', seconds: 1 },
] as const;

export interface CountdownPart {
  amount: number;
  // Two digits below the days, so a count holds its width as it ticks down
  digits: string;
  unit: (typeof UNITS)[number]['unit'];
  name: (typeof UNITS)[number]['name'];
}

// Down to the second, rounded up so it reaches zero on the instant itself, and leaving
// out the days once none are left
export function countdownParts(milliseconds: number): CountdownPart[] {
  let left = Math.max(0, Math.ceil(milliseconds / 1000));
  return UNITS.flatMap(({ unit, name, seconds }): CountdownPart[] => {
    const amount = Math.floor(left / seconds);
    left %= seconds;
    if (unit === 'd') {
      return amount ? [{ amount, digits: String(amount), unit, name }] : [];
    }
    return [{ amount, digits: String(amount).padStart(2, '0'), unit, name }];
  });
}

export function describeCountdown(parts: CountdownPart[]): string {
  return parts
    .map(({ amount, name }) => `${amount} ${name}${amount === 1 ? '' : 's'}`)
    .join(', ');
}
