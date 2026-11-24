import { defer, repeat, timer } from 'rxjs';

// Each turn of the clock's second hand, aimed afresh every time so the ticks never drift
// off it
export const SECOND_TICKS = defer(() => timer(1000 - (Date.now() % 1000))).pipe(repeat());
