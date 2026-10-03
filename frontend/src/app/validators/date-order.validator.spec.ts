import { FormControl, FormGroup } from '@angular/forms';

import { closesAfterOpensValidator, notBeforeDayValidator } from './date-order.validator';

describe('date order validators', () => {
  describe('notBeforeDayValidator', () => {
    const group = (start: Date | null, end: Date | null) =>
      new FormGroup({
        start: new FormControl<Date | null>(start),
        end: new FormControl<Date | null>(end, notBeforeDayValidator('start')),
      });

    it('should accept an end on or after the start, or either left empty', () => {
      expect(
        group(new Date(2026, 9, 15), new Date(2026, 9, 15)).controls.end.errors,
      ).toBeNull();
      expect(
        group(new Date(2026, 9, 15), new Date(2026, 9, 29)).controls.end.errors,
      ).toBeNull();
      expect(group(null, new Date(2026, 9, 1)).controls.end.errors).toBeNull();
      expect(group(new Date(2026, 9, 15), null).controls.end.errors).toBeNull();
    });

    it('should refuse an end before the start', () => {
      const form = group(new Date(2026, 9, 15), new Date(2026, 9, 14));

      form.controls.end.updateValueAndValidity();

      expect(form.controls.end.errors).toEqual({ endBeforeStart: true });
    });
  });

  describe('closesAfterOpensValidator', () => {
    const group = (
      opensTime: string | null,
      closesDay: Date,
      closesTime: string | null,
    ) => {
      const form = new FormGroup({
        opensDay: new FormControl<Date | null>(new Date(2026, 9, 1)),
        opensTime: new FormControl<string | null>(opensTime),
        closesDay: new FormControl<Date | null>(closesDay),
        closesTime: new FormControl<string | null>(
          closesTime,
          closesAfterOpensValidator({
            opensDay: 'opensDay',
            opensTime: 'opensTime',
            closesDay: 'closesDay',
          }),
        ),
      });
      form.controls.closesTime.updateValueAndValidity();
      return form.controls.closesTime.errors;
    };

    it('should accept a closing time after the opening', () => {
      expect(group('12:00', new Date(2026, 9, 1), '12:05')).toBeNull();
      expect(group('12:00', new Date(2026, 9, 15), '09:00')).toBeNull();
    });

    it('should refuse a closing time at or before the opening', () => {
      expect(group('12:00', new Date(2026, 9, 1), '12:00')).toEqual({
        closesBeforeOpens: true,
      });
      expect(group('12:00', new Date(2026, 8, 30), '18:00')).toEqual({
        closesBeforeOpens: true,
      });
    });

    it('should wait until both times are complete', () => {
      expect(group(null, new Date(2026, 8, 1), '12:00')).toBeNull();
      expect(group('12:00', new Date(2026, 8, 1), null)).toBeNull();
    });
  });
});
