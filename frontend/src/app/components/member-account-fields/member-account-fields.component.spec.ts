import { InputComponent, NumberInputComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';

import { MemberAccountFormGroup } from '@app/models';
import { createMemberAccountGroup, query } from '@app/utils';

import { MemberAccountFieldsComponent } from './member-account-fields.component';

describe('MemberAccountFieldsComponent', () => {
  let fixture: ComponentFixture<MemberAccountFieldsComponent>;
  let group: FormGroup<MemberAccountFormGroup>;

  const inputWithLabel = (label: string): InputComponent =>
    fixture.debugElement
      .queryAll(debugElement => debugElement.componentInstance instanceof InputComponent)
      .map((debugElement): InputComponent => debugElement.componentInstance)
      .find(field => field.label() === label)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberAccountFieldsComponent],
    }).compileComponents();

    group = createMemberAccountGroup();
    group.patchValue({
      firstName: 'Ann',
      email: 'ann@example.com',
      city: 'London',
      phoneNumber: '416-555-0100',
      lichessUsername: 'ann_lichess',
      chessComUsername: 'ann_chesscom',
    });
    fixture = TestBed.createComponent(MemberAccountFieldsComponent);
    fixture.componentRef.setInput('group', group);
  });

  it('should bind every field of the group', () => {
    fixture.detectChanges();

    const values = [
      'input#phone-number-input',
      'input#lichess-username-input',
      'input#chess-com-username-input',
    ].map(selector => query(fixture.debugElement, selector).nativeElement.value);
    expect(inputWithLabel('First name').value()).toBe('Ann');
    expect(inputWithLabel('Email').value()).toBe('ann@example.com');
    expect(inputWithLabel('City').value()).toBe('London');
    expect(values).toEqual(['416-555-0100', 'ann_lichess', 'ann_chesscom']);
  });

  it('should require the year of birth and not autofocus by default', () => {
    fixture.detectChanges();

    const yearOfBirth: NumberInputComponent = query(
      fixture.debugElement,
      'ea-number-input',
    ).componentInstance;
    expect(yearOfBirth.required()).toBe(true);
    expect(inputWithLabel('First name').autofocus()).toBe(false);
  });

  it('should pass on autofocus and an optional year of birth', () => {
    fixture.componentRef.setInput('autofocus', true);
    fixture.componentRef.setInput('yearOfBirthRequired', false);

    fixture.detectChanges();

    const yearOfBirth: NumberInputComponent = query(
      fixture.debugElement,
      'ea-number-input',
    ).componentInstance;
    expect(yearOfBirth.required()).toBe(false);
    expect(inputWithLabel('First name').autofocus()).toBe(true);
  });
});
