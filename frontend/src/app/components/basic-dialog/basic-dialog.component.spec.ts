import { ButtonComponent, DialogRef, ProgressBarComponent } from '@eagami/ui';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogResult, Dialog } from '@app/models';
import { query, queryAll, queryTextContent } from '@app/utils';

import { BasicDialogComponent } from './basic-dialog.component';

describe('BasicDialogComponent', () => {
  let fixture: ComponentFixture<BasicDialogComponent>;
  let component: BasicDialogComponent;
  let dialogRef: DialogRef<BasicDialogResult>;
  let closeSpy: MockInstance;

  const mockDialog: Dialog = {
    title: 'Confirm',
    body: 'Body of the mock dialog',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Keep editing',
    confirmButtonType: 'primary',
  };

  const mockWarningDialog: Dialog = {
    title: 'Confirm',
    body: 'Body of the mock warning dialog',
    confirmButtonText: 'Delete',
    confirmButtonType: 'warning',
  };

  function render(dialog: Dialog): void {
    fixture?.destroy();
    fixture = TestBed.createComponent(BasicDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dialog', dialog);
    fixture.detectChanges();
  }

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const pressEnter = (target: Element): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  };

  beforeEach(async () => {
    dialogRef = new DialogRef<BasicDialogResult>();
    closeSpy = vi.spyOn(dialogRef, 'close');

    await TestBed.configureTestingModule({
      imports: [BasicDialogComponent],
      providers: [{ provide: DialogRef, useValue: dialogRef }],
    }).compileComponents();

    render(mockDialog);
  });

  describe('rendering', () => {
    it('should open with the title in the header and the body below it', () => {
      expect(queryTextContent(fixture.debugElement, '[slot="header"]')).toBe('Confirm');
      expect(queryTextContent(fixture.debugElement, '.dialog-body')).toBe(
        'Body of the mock dialog',
      );
      expect(
        query(fixture.debugElement, 'dialog').nativeElement.hasAttribute('open'),
      ).toBe(true);
    });

    it('should label the buttons from the dialog, defaulting the cancel text', () => {
      expect(queryTextContent(fixture.debugElement, '.cancel-button')).toBe(
        'Keep editing',
      );

      render(mockWarningDialog);

      expect(queryTextContent(fixture.debugElement, '.cancel-button')).toBe('Cancel');
      expect(queryTextContent(fixture.debugElement, '.confirm-button')).toBe('Delete');
    });

    it('should style a warning confirmation as a danger button', () => {
      expect(button('.confirm-button').variant()).toBe('primary');

      render(mockWarningDialog);

      expect(button('.confirm-button').variant()).toBe('danger');
    });
  });

  describe('answers', () => {
    it('should answer cancel from the cancel button', () => {
      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(closeSpy).toHaveBeenCalledWith('cancel');
    });

    it('should answer confirm from the confirm button', async () => {
      query(fixture.debugElement, '.confirm-button').triggerEventHandler('clicked');
      await fixture.whenStable();

      expect(closeSpy).toHaveBeenCalledWith('confirm');
    });

    it('should answer confirm when Enter is pressed away from the buttons', async () => {
      pressEnter(query(fixture.debugElement, '.dialog-body').nativeElement);
      await fixture.whenStable();

      expect(closeSpy).toHaveBeenCalledWith('confirm');
    });

    it('should leave Enter on a focused button to that button', () => {
      const cancel = query(fixture.debugElement, '.cancel-button button').nativeElement;

      pressEnter(cancel);

      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should close without an answer when the dialog is dismissed', () => {
      query(fixture.debugElement, '.ea-dialog__close').nativeElement.click();

      expect(closeSpy).toHaveBeenCalledWith();
    });
  });

  describe('with a confirm action', () => {
    let confirmAction: Mock<Promise<unknown>, []>;
    let finishAction: () => void;

    beforeEach(() => {
      confirmAction = vi.fn<() => Promise<unknown>>(
        () => new Promise<void>(resolve => (finishAction = () => resolve())),
      );
      render({ ...mockDialog, confirmAction });
    });

    it('should stay open and busy until the action finishes', async () => {
      const confirmation = component.confirm();
      fixture.detectChanges();

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(button('.confirm-button').loading()).toBe(true);
      expect(button('.cancel-button').disabled()).toBe(true);
      expect(closeSpy).not.toHaveBeenCalled();

      finishAction();
      await confirmation;

      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledWith('confirm');
    });

    it('should run the action once however often Enter is pressed', () => {
      const body = query(fixture.debugElement, '.dialog-body').nativeElement;

      pressEnter(body);
      pressEnter(body);

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  describe('upload progress', () => {
    const uploadProgress = signal<{ uploaded: number; total: number } | null>(null);

    beforeEach(() => {
      uploadProgress.set(null);
      render({ ...mockDialog, uploadProgress });
    });

    it('should not show progress before any upload starts', () => {
      expect(queryAll(fixture.debugElement, 'ea-progress-bar')).toHaveLength(0);
    });

    it('should show the progress of the uploads in flight', () => {
      uploadProgress.set({ uploaded: 1, total: 3 });
      fixture.detectChanges();

      const progressBar: ProgressBarComponent = query(
        fixture.debugElement,
        'ea-progress-bar',
      ).componentInstance;
      expect(progressBar.value()).toBe(1);
      expect(progressBar.max()).toBe(3);
      expect(progressBar.label()).toBe('Uploaded 1 of 3 images');
    });

    it('should use the singular for a single upload', () => {
      uploadProgress.set({ uploaded: 0, total: 1 });
      fixture.detectChanges();

      const progressBar: ProgressBarComponent = query(
        fixture.debugElement,
        'ea-progress-bar',
      ).componentInstance;
      expect(progressBar.label()).toBe('Uploaded 0 of 1 image');
    });
  });
});
