import { InputComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { query, queryAll } from '@app/utils';

import { ChessUsernameFieldsComponent } from './chess-username-fields.component';

describe('ChessUsernameFieldsComponent', () => {
  let fixture: ComponentFixture<ChessUsernameFieldsComponent>;
  let lichess: FormControl<string>;
  let chessCom: FormControl<string>;

  const input = (id: string): HTMLInputElement =>
    query(fixture.debugElement, `input#${id}`).nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChessUsernameFieldsComponent],
    }).compileComponents();

    lichess = new FormControl('lich_user', { nonNullable: true });
    chessCom = new FormControl('chesscom_user', { nonNullable: true });
    fixture = TestBed.createComponent(ChessUsernameFieldsComponent);
    fixture.componentRef.setInput('lichessUsername', lichess);
    fixture.componentRef.setInput('chessComUsername', chessCom);
    fixture.detectChanges();
  });

  it('should bind each control to its own labelled input', () => {
    expect(input('lichess-username-input').value).toBe('lich_user');
    expect(input('chess-com-username-input').value).toBe('chesscom_user');
    expect(
      query(fixture.debugElement, 'label[for="lichess-username-input"]'),
    ).toBeTruthy();
    expect(
      query(fixture.debugElement, 'label[for="chess-com-username-input"]'),
    ).toBeTruthy();
  });

  it('should write typed usernames back to their controls', () => {
    input('lichess-username-input').value = 'new_lichess';
    input('lichess-username-input').dispatchEvent(new Event('input'));
    input('chess-com-username-input').value = 'new_chesscom';
    input('chess-com-username-input').dispatchEvent(new Event('input'));

    expect(lichess.value).toBe('new_lichess');
    expect(chessCom.value).toBe('new_chesscom');
  });

  it('should explain on hover how each username is used', () => {
    const [lichessHelp, chessComHelp] = queryAll(
      fixture.debugElement,
      '.field-label__help',
    );

    lichessHelp.triggerEventHandler('mouseenter', new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const lichessText = document.querySelector('.cdk-overlay-container')?.textContent;
    lichessHelp.triggerEventHandler('mouseleave');
    chessComHelp.triggerEventHandler('mouseenter', new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const chessComText = document.querySelector('.cdk-overlay-container')?.textContent;
    expect(lichessText).toContain('Optional.');
    expect(chessComText).toContain('Optional.');
    expect(chessComText).not.toBe(lichessText);
  });

  it('should explain a pattern error on each platform differently', () => {
    const [lichessField, chessComField] = queryAll(fixture.debugElement, 'ea-input').map(
      (debugElement): InputComponent => debugElement.componentInstance,
    );

    expect(lichessField.errorMessages()?.['pattern']).toBeTruthy();
    expect(lichessField.errorMessages()?.['pattern']).not.toBe(
      chessComField.errorMessages()?.['pattern'],
    );
  });
});
