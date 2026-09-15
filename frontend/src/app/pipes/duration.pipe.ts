import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transform duration in seconds to `MM:SS` format.
 */
@Pipe({
  name: 'duration',
})
export class DurationPipe implements PipeTransform {
  transform(value: unknown): string {
    const seconds = typeof value === 'number' ? Math.max(0, Math.floor(value)) : 0;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const mm = minutes.toString().padStart(2, '0');
    const ss = remainingSeconds.toString().padStart(2, '0');

    return `${mm}:${ss}`;
  }
}
