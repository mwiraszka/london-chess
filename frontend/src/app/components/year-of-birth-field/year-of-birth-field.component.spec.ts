import { NumberInputComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { MIN_YEAR_OF_BIRTH } from '@app/constants/member-details';
import { query } from '@app/utils';

import { YearOfBirthFieldComponent } from './year-of-birth-field.component';

describe('YearOfBirthFieldComponent', () => {
  let fixture: ComponentFixture<YearOfBirthFieldComponent>;

  const field = (): NumberInputComponent =>
    query(fixture.debugElement, 'ea-number-input').componentInstance;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    await TestBed.configureTestingModule({
      imports: [YearOfBirthFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YearOfBirthFieldComponent);
    fixture.componentRef.setInput('control', new FormControl<number | null>(1990));
  });

  it('should accept years from the minimum up to the current year', () => {
    fixture.detectChanges();

    expect(field().min()).toBe(MIN_YEAR_OF_BIRTH);
    expect(field().max()).toBe(2026);
    expect(field().required()).toBe(true);
  });

  it('should allow the year to be optional', () => {
    fixture.componentRef.setInput('required', false);

    fixture.detectChanges();

    expect(field().required()).toBe(false);
  });
});
