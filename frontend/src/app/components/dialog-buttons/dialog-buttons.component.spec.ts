import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryTextContent } from '@app/utils';

import { DialogButtonsComponent } from './dialog-buttons.component';

describe('DialogButtonsComponent', () => {
  let fixture: ComponentFixture<DialogButtonsComponent>;
  let component: DialogButtonsComponent;

  let resultSpy: MockInstance;

  function cancelButton(): HTMLButtonElement {
    return query(fixture.debugElement, '.cancel-button').nativeElement;
  }

  function confirmButton(): HTMLButtonElement {
    return query(fixture.debugElement, '.confirm-button').nativeElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogButtonsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogButtonsComponent);
    component = fixture.componentInstance;

    resultSpy = vi.spyOn(component.result, 'emit');

    fixture.componentRef.setInput('confirmText', 'Delete');
    fixture.detectChanges();
  });

  describe('template rendering', () => {
    it('should render the button labels', () => {
      expect(queryTextContent(fixture.debugElement, '.cancel-button')).toBe('Cancel');
      expect(queryTextContent(fixture.debugElement, '.confirm-button')).toBe('Delete');
    });

    it('should render a custom cancel label', () => {
      fixture.componentRef.setInput('cancelText', 'Keep editing');
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.cancel-button')).toBe(
        'Keep editing',
      );
    });

    it('should style the confirm button as a primary action by default', () => {
      expect(confirmButton().classList).toContain('lcc-primary-button');
      expect(confirmButton().classList).not.toContain('lcc-warning-button');
    });

    it('should style the confirm button as a warning when asked', () => {
      fixture.componentRef.setInput('confirmVariant', 'warning');
      fixture.detectChanges();

      expect(confirmButton().classList).toContain('lcc-warning-button');
      expect(confirmButton().classList).not.toContain('lcc-primary-button');
    });

    it('should disable the confirm button when asked', () => {
      fixture.componentRef.setInput('confirmDisabled', true);
      fixture.detectChanges();

      expect(confirmButton().disabled).toBe(true);
      expect(cancelButton().disabled).toBe(false);
    });

    it('should not show a spinner when idle', () => {
      expect(query(fixture.debugElement, 'ea-spinner')).toBeFalsy();
      expect(confirmButton().getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('without a confirm action', () => {
    it('should confirm straight away', () => {
      query(fixture.debugElement, '.confirm-button').triggerEventHandler('click');

      expect(resultSpy).toHaveBeenCalledTimes(1);
      expect(resultSpy).toHaveBeenCalledWith('confirm');
    });

    it('should cancel', () => {
      query(fixture.debugElement, '.cancel-button').triggerEventHandler('click');

      expect(resultSpy).toHaveBeenCalledTimes(1);
      expect(resultSpy).toHaveBeenCalledWith('cancel');
    });

    it('should not confirm while disabled', async () => {
      fixture.componentRef.setInput('confirmDisabled', true);

      await component.confirm();

      expect(resultSpy).not.toHaveBeenCalled();
    });
  });

  describe('with a confirm action', () => {
    let confirmAction: Mock<Promise<unknown>, []>;
    let finishAction: () => void;

    beforeEach(() => {
      confirmAction = vi.fn<() => Promise<unknown>>(
        () => new Promise<void>(resolve => (finishAction = () => resolve())),
      );
      fixture.componentRef.setInput('confirmAction', confirmAction);
      fixture.detectChanges();
    });

    it('should show a spinner on the confirm button until the action finishes', async () => {
      const confirmation = component.confirm();
      fixture.detectChanges();

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(query(fixture.debugElement, '.confirm-button ea-spinner')).toBeTruthy();
      expect(confirmButton().getAttribute('aria-busy')).toBe('true');
      expect(resultSpy).not.toHaveBeenCalled();

      finishAction();
      await confirmation;
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-spinner')).toBeFalsy();
      expect(confirmButton().getAttribute('aria-busy')).toBe('false');
      expect(resultSpy).toHaveBeenCalledTimes(1);
      expect(resultSpy).toHaveBeenCalledWith('confirm');
    });

    it('should keep the confirm label in place so the button holds its width', () => {
      void component.confirm();
      fixture.detectChanges();

      expect(confirmButton().classList).toContain('confirm-button--pending');
      expect(queryTextContent(fixture.debugElement, '.confirm-button__label')).toBe(
        'Delete',
      );
    });

    it('should disable both buttons while the action runs', () => {
      void component.confirm();
      fixture.detectChanges();

      expect(confirmButton().disabled).toBe(true);
      expect(cancelButton().disabled).toBe(true);
    });

    it('should run the action only once when confirmed repeatedly', async () => {
      const confirmation = component.confirm();
      await component.confirm();

      finishAction();
      await confirmation;

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(resultSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop loading without confirming when the action throws', async () => {
      confirmAction.mockRejectedValueOnce(new Error('Network error'));

      await expect(component.confirm()).rejects.toThrow('Network error');
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-spinner')).toBeFalsy();
      expect(confirmButton().disabled).toBe(false);
      expect(resultSpy).not.toHaveBeenCalled();
    });
  });
});
