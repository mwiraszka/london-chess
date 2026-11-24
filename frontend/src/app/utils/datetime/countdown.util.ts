const UNITS = [
  { unit: 'd', name: 'day', seconds: 86_400 },
  { unit: 'h', name: 'hour', seconds: 3_600 },
  { unit: 'm', name: 'minute', seconds: 60 },
  { unit: 's', name: 'second', seconds: 1 },
] as const;

export interface CountdownPart {
  amount: number;
  // At least two digits, so a count holds its shape as it ticks down
  digits: string;
  unit: (typeof UNITS)[number]['unit'];
  name: (typeof UNITS)[number]['name'];
}

// Every unit down to the second, rounded up so it reaches zero on the instant itself
export function countdownParts(milliseconds: number): CountdownPart[] {
  let left = Math.max(0, Math.ceil(milliseconds / 1000));
  return UNITS.map(({ unit, name, seconds }): CountdownPart => {
    const amount = Math.floor(left / seconds);
    left %= seconds;
    return { amount, digits: String(amount).padStart(2, '0'), unit, name };
  });
}

// Read out from the first unit with any left, as its empty leading units say nothing
export function describeCountdown(parts: CountdownPart[]): string {
  const first = parts.findIndex(({ amount }) => amount > 0);
  return parts
    .slice(first === -1 ? parts.length - 1 : first)
    .map(({ amount, name }) => `${amount} ${name}${amount === 1 ? '' : 's'}`)
    .join(', ');
}
