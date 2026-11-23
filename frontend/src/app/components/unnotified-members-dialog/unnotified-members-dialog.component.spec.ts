import { ButtonComponent, DialogRef } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnnotifiedMember } from '@app/models';
import { query, queryAll } from '@app/utils';

import { UnnotifiedMembersDialogComponent } from './unnotified-members-dialog.component';

describe('UnnotifiedMembersDialogComponent', () => {
  let fixture: ComponentFixture<UnnotifiedMembersDialogComponent>;

  let closeSpy: MockInstance;
  let writeTextSpy: Mock<(text: string) => Promise<void>>;

  const members: UnnotifiedMember[] = [
    { name: 'Jane Doe', email: 'jane@example.com' },
    { name: 'Olga Zhou', email: 'olga@example.com' },
  ];

  const copyButton = (): ButtonComponent =>
    query(fixture.debugElement, '.copy-button').componentInstance;

  const text = (selector: string): string =>
    query(fixture.debugElement, selector).nativeElement.textContent.trim();

  beforeEach(async () => {
    const dialogRef = new DialogRef();
    closeSpy = vi.spyOn(dialogRef, 'close');
    writeTextSpy = vi.fn(async () => undefined);
    // The test browser has no clipboard of its own
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [UnnotifiedMembersDialogComponent],
      providers: [{ provide: DialogRef, useValue: dialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(UnnotifiedMembersDialogComponent);
    fixture.componentRef.setInput('subject', 'the new event Blitz');
    fixture.componentRef.setInput('members', members);
    fixture.detectChanges();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('should say what the email was about and how many members it missed', () => {
    expect(text('.unnotified-members__intro')).toBe(
      'The email about the new event Blitz could not be sent to these 2 members. The save itself went through, so you may want to let them know another way.',
    );
  });

  it('should list each member with a link to email them', () => {
    const rows = queryAll(fixture.debugElement, '.unnotified-members__member');

    expect(
      rows.map(row => [
        query(row, '.unnotified-members__name').nativeElement.textContent.trim(),
        query(row, '.unnotified-members__email').nativeElement.getAttribute('href'),
      ]),
    ).toEqual([
      ['Jane Doe', 'mailto:jane@example.com'],
      ['Olga Zhou', 'mailto:olga@example.com'],
    ]);
  });

  it('should copy every address at once', async () => {
    copyButton().clicked.emit(new MouseEvent('click'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeTextSpy).toHaveBeenCalledExactlyOnceWith(
      'jane@example.com, olga@example.com',
    );
    expect(text('.copy-button')).toBe('Addresses copied');
  });

  it('should say when the addresses could not be copied', async () => {
    writeTextSpy.mockRejectedValue(new Error('Denied'));

    copyButton().clicked.emit(new MouseEvent('click'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text('.copy-button')).toBe('Could not copy the addresses');
  });

  it('should close when done', () => {
    query(fixture.debugElement, '.close-button').componentInstance.clicked.emit(
      new MouseEvent('click'),
    );

    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
