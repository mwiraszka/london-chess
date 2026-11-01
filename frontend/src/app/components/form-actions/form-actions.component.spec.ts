import { ButtonComponent, DialogService } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { closedDialogRef, query } from '@app/utils';

import { FormActionsComponent } from './form-actions.component';

describe('FormActionsComponent', () => {
  let fixture: ComponentFixture<FormActionsComponent>;
  let component: FormActionsComponent;
  let dialogOpenSpy: MockInstance;
  let cancelSpy: MockInstance;
  let restoreSpy: MockInstance;

  const render = (hasUnsavedChanges = true, submitDisabled = false, isNew = false) => {
    fixture.componentRef.setInput('entity', 'event');
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('isNew', isNew);
    fixture.componentRef.setInput('submitDisabled', submitDisabled);
    fixture.componentRef.setInput('submitLabel', 'Update event');
    fixture.detectChanges();
  };

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormActionsComponent],
      providers: [
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormActionsComponent);
    component = fixture.componentInstance;
    dialogOpenSpy = vi.spyOn(TestBed.inject(DialogService), 'open');
    cancelSpy = vi.spyOn(component.cancel, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');
  });

  it('should lay the buttons out as the shared form actions', () => {
    render();

    expect(fixture.nativeElement.classList).toContain('lcc-form-actions');
    expect(button('.submit-button').type()).toBe('submit');
    expect(fixture.nativeElement.querySelector('.submit-button').textContent.trim()).toBe(
      'Update event',
    );
  });

  it('should only offer to revert once something has changed', () => {
    render(false);
    const disabledWithout = button('.restore-button').disabled();
    fixture.componentRef.setInput('hasUnsavedChanges', true);

    fixture.detectChanges();

    expect(disabledWithout).toBe(true);
    expect(button('.restore-button').disabled()).toBe(false);
  });

  it('should hold the save button back when told to', () => {
    render(true, true);

    expect(button('.submit-button').disabled()).toBe(true);
  });

  it('should cancel from the cancel button', () => {
    render();

    query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

    expect(cancelSpy).toHaveBeenCalledOnce();
  });

  it('should revert a saved record once the dialog is confirmed', async () => {
    render();
    dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

    await component.onRevert();

    expect(dialogOpenSpy).toHaveBeenCalledExactlyOnceWith(BasicDialogComponent, {
      inputs: {
        dialog: {
          title: 'Confirm',
          body: 'Revert to the saved event? Your changes will be lost.',
          confirmButtonText: 'Revert',
          confirmButtonType: 'warning',
        },
      },
    });
    expect(restoreSpy).toHaveBeenCalledOnce();
  });

  it('should offer to clear a record that was never saved', async () => {
    render(true, false, true);
    dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

    await component.onRevert();

    expect(dialogOpenSpy).toHaveBeenCalledExactlyOnceWith(BasicDialogComponent, {
      inputs: {
        dialog: {
          title: 'Confirm',
          body: 'Clear this new event? Everything entered will be lost.',
          confirmButtonText: 'Clear',
          confirmButtonType: 'warning',
        },
      },
    });
    expect(restoreSpy).toHaveBeenCalledOnce();
  });

  it('should keep the changes when the dialog is cancelled', async () => {
    render();
    dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

    await component.onRevert();

    expect(restoreSpy).not.toHaveBeenCalled();
  });

  it('should ask before reverting from the revert button', () => {
    render();

    query(fixture.debugElement, '.restore-button').triggerEventHandler('clicked');

    expect(dialogOpenSpy).toHaveBeenCalledOnce();
  });
});
