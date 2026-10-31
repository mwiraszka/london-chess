import { InputComponent } from '@eagami/ui';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { query, queryAll } from '@app/utils';

import { FederationIdFieldsComponent } from './federation-id-fields.component';

describe('FederationIdFieldsComponent', () => {
  let fixture: ComponentFixture<FederationIdFieldsComponent>;
  let fide: FormControl<string>;
  let cfc: FormControl<string>;

  const input = (id: string): HTMLInputElement =>
    query(fixture.debugElement, `input#${id}`).nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FederationIdFieldsComponent],
    }).compileComponents();

    fide = new FormControl('2600123', { nonNullable: true });
    cfc = new FormControl('150123', { nonNullable: true });
    fixture = TestBed.createComponent(FederationIdFieldsComponent);
    fixture.componentRef.setInput('fideId', fide);
    fixture.componentRef.setInput('cfcId', cfc);
    fixture.detectChanges();
  });

  it('should bind each control to its own labelled input', () => {
    expect(input('fide-id-input').value).toBe('2600123');
    expect(input('cfc-id-input').value).toBe('150123');
    expect(query(fixture.debugElement, 'label[for="fide-id-input"]')).toBeTruthy();
    expect(query(fixture.debugElement, 'label[for="cfc-id-input"]')).toBeTruthy();
  });

  it('should write typed IDs back to their controls', () => {
    input('fide-id-input').value = '1503014';
    input('fide-id-input').dispatchEvent(new Event('input'));
    input('cfc-id-input').value = '105938';
    input('cfc-id-input').dispatchEvent(new Event('input'));

    expect(fide.value).toBe('1503014');
    expect(cfc.value).toBe('105938');
  });

  it('should explain how each ID is used when its help is opened', () => {
    const helpText = (field: DebugElement): string => {
      query(field, '.ea-field-label__help-trigger').nativeElement.click();
      fixture.detectChanges();
      return query(field, '.ea-field-label__help-bubble').nativeElement.textContent;
    };
    const [fideField, cfcField] = queryAll(fixture.debugElement, 'ea-input');

    const fideText = helpText(fideField);
    const cfcText = helpText(cfcField);

    expect(fideText).toContain('FIDE ratings');
    expect(cfcText).toContain('CFC ratings');
  });

  it('should explain a pattern error on each ID differently', () => {
    const [fideField, cfcField] = queryAll(fixture.debugElement, 'ea-input').map(
      (debugElement): InputComponent => debugElement.componentInstance,
    );

    expect(fideField.errorMessages()?.['pattern']).toBeTruthy();
    expect(fideField.errorMessages()?.['pattern']).not.toBe(
      cfcField.errorMessages()?.['pattern'],
    );
  });
});
