import { Renderer2, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogButtonsComponent } from '@app/components/dialog-buttons/dialog-buttons.component';
import { Dialog } from '@app/models';
import { query, queryAll, queryTextContent } from '@app/utils';

import { BasicDialogComponent } from './basic-dialog.component';

describe('BasicDialogComponent', () => {
  let fixture: ComponentFixture<BasicDialogComponent>;
  let component: BasicDialogComponent;

  const mockDialog: Dialog = {
    title: 'Confirm' as const,
    body: 'Body of the mock dialog',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    confirmButtonType: 'primary' as const,
  };

  const mockWarningDialog = {
    title: 'Confirm' as const,
    body: 'Body of the mock warning dialog',
    confirmButtonText: 'Delete',
    confirmButtonType: 'warning' as const,
  };

  let dialogResultSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicDialogComponent],
      providers: [{ provide: Renderer2, useValue: { listen: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(BasicDialogComponent);
    component = fixture.componentInstance;

    dialogResultSpy = vi.spyOn(component.dialogResult, 'emit');

    fixture.componentRef.setInput('dialog', mockDialog);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('dialog result handling', () => {
    it('should emit "cancel" when cancel button is clicked', () => {
      query(fixture.debugElement, '.cancel-button').triggerEventHandler('click');

      expect(dialogResultSpy).toHaveBeenCalledWith('cancel');
    });

    it('should emit "confirm" when confirm button is clicked', () => {
      query(fixture.debugElement, '.confirm-button').triggerEventHandler('click');

      expect(dialogResultSpy).toHaveBeenCalledWith('confirm');
    });

    it('should emit "confirm" when enter key is pressed', () => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      document.dispatchEvent(enterEvent);

      expect(dialogResultSpy).toHaveBeenCalledWith('confirm');
    });
  });

  describe('with a confirm action', () => {
    let confirmAction: Mock<Promise<unknown>, []>;
    let finishAction: () => void;

    beforeEach(() => {
      confirmAction = vi.fn<() => Promise<unknown>>(
        () => new Promise<void>(resolve => (finishAction = () => resolve())),
      );
      fixture.destroy();
      fixture = TestBed.createComponent(BasicDialogComponent);
      component = fixture.componentInstance;
      dialogResultSpy = vi.spyOn(component.dialogResult, 'emit');
      fixture.componentRef.setInput('dialog', { ...mockDialog, confirmAction });
      fixture.detectChanges();
    });

    it('should stay open until the confirm action finishes', async () => {
      const buttons: DialogButtonsComponent = query(
        fixture.debugElement,
        'lcc-dialog-buttons',
      ).componentInstance;

      const confirmation = buttons.confirm();
      fixture.detectChanges();

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(query(fixture.debugElement, '.confirm-button ea-spinner')).toBeTruthy();
      expect(dialogResultSpy).not.toHaveBeenCalled();

      finishAction();
      await confirmation;

      expect(dialogResultSpy).toHaveBeenCalledTimes(1);
      expect(dialogResultSpy).toHaveBeenCalledWith('confirm');
    });

    it('should run the action once however often enter is pressed', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

      document.dispatchEvent(enterEvent);
      document.dispatchEvent(enterEvent);

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(dialogResultSpy).not.toHaveBeenCalled();
    });
  });

  describe('upload progress', () => {
    const uploadProgress = signal<{ uploaded: number; total: number } | null>(null);

    beforeEach(() => {
      uploadProgress.set(null);
      fixture.destroy();
      fixture = TestBed.createComponent(BasicDialogComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('dialog', { ...mockDialog, uploadProgress });
      fixture.detectChanges();
    });

    it('should not render a progress bar before any upload starts', () => {
      expect(query(fixture.debugElement, 'ea-progress-bar')).toBeFalsy();
    });

    it('should render the progress of the uploads in flight', () => {
      uploadProgress.set({ uploaded: 1, total: 3 });
      fixture.detectChanges();

      const progressBar = query(
        fixture.debugElement,
        'ea-progress-bar',
      ).componentInstance;
      expect(progressBar.value()).toBe(1);
      expect(progressBar.max()).toBe(3);
      expect(queryTextContent(fixture.debugElement, '.upload-progress__text')).toBe(
        'Uploaded 1 of 3 images',
      );
    });

    it('should use the singular for a single upload', () => {
      uploadProgress.set({ uploaded: 0, total: 1 });
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.upload-progress__text')).toBe(
        'Uploaded 0 of 1 image',
      );
    });

    it('should not render a progress bar for dialogs without uploads', () => {
      fixture.destroy();
      fixture = TestBed.createComponent(BasicDialogComponent);
      fixture.componentRef.setInput('dialog', mockDialog);
      fixture.detectChanges();

      expect(queryAll(fixture.debugElement, '.upload-progress')).toHaveLength(0);
    });
  });

  describe('template rendering', () => {
    it('should render dialog title and body', () => {
      expect(queryTextContent(fixture.debugElement, 'h3')).toBe(mockDialog.title);
      expect(queryTextContent(fixture.debugElement, 'p')).toBe(mockDialog.body);
    });

    it('should use default cancel text if not provided', () => {
      fixture.componentRef.setInput('dialog', mockWarningDialog);
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.cancel-button')).toBe('Cancel');
    });
  });
});
