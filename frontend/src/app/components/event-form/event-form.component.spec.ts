import { ButtonComponent, DialogService } from '@eagami/ui';
import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EVENT_FORM_DATA_PROPERTIES, INITIAL_EVENT_FORM_DATA } from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { Event, EventFormData } from '@app/models';
import { StoreRequestService } from '@app/services';
import { EventsActions } from '@app/store/events';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { closedDialogRef, lastOpenedDialog, query, toDayString } from '@app/utils';

import { EventFormComponent } from './event-form.component';

describe('EventFormComponent', () => {
  let fixture: ComponentFixture<EventFormComponent>;
  let component: EventFormComponent;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: Mock;
  let restoreSpy: MockInstance;
  let storeRequestSpy: Mock;

  // 6:30 PM on October 15, 2026 in London, Ontario
  const eventDate = '2026-10-15T22:30:00.000Z';
  const formData: EventFormData = {
    ...pick(MOCK_EVENTS[0], EVENT_FORM_DATA_PROPERTIES),
    eventDate,
    articleId: '',
  };

  function render(
    data: EventFormData = formData,
    hasUnsavedChanges = false,
    originalEvent: Event | null = null,
  ): void {
    fixture = TestBed.createComponent(EventFormComponent);
    component = fixture.componentInstance;
    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');

    fixture.componentRef.setInput('formData', data);
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('originalEvent', originalEvent);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const lastDraft = (): Partial<EventFormData> => changeSpy.mock.lastCall?.[0].formData;

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const errorTexts = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="alert"]')).map(
      element => element.textContent?.trim() ?? '',
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFormComponent],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
  });

  describe('initialization', () => {
    it("should split the event's instant into its day and start time on the club clock", () => {
      render();

      const { eventDay, eventTime, title, type } = component.form.getRawValue();
      expect(toDayString(eventDay!)).toBe('2026-10-15');
      expect(eventTime).toBe('18:30');
      expect(title).toBe(formData.title);
      expect(type).toBe(formData.type);
    });

    it('should start a fresh form without any errors showing', async () => {
      render({ ...INITIAL_EVENT_FORM_DATA });

      await settle();

      expect(component.form.invalid).toBe(true);
      expect(component.form.touched).toBe(false);
      expect(errorTexts()).toEqual([]);
    });

    it('should show the errors of a restored draft straight away', async () => {
      render({ ...formData, title: '' }, true);

      await settle();

      expect(component.form.controls.title.touched).toBe(true);
      expect(errorTexts()).toHaveLength(1);
    });

    it('should pass the draft to the store as soon as the form opens', () => {
      render();

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft()).toEqual(formData);
    });
  });

  describe('keeping the draft', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      render();
      changeSpy.mockClear();
    });

    afterEach(() => vi.useRealTimers());

    it('should pass changes on once typing pauses', () => {
      component.form.controls.title.setValue('Rook endings');
      component.form.controls.title.setValue('Rook endings night');
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE - 1);
      const beforePause = changeSpy.mock.calls.length;

      vi.advanceTimersByTime(1);

      expect(beforePause).toBe(0);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft()).toEqual(
        expect.objectContaining({ title: 'Rook endings night', eventDate }),
      );
    });

    it('should join a new day and time into the instant on the club clock', () => {
      component.form.patchValue({ eventDay: new Date(2026, 10, 12), eventTime: '19:15' });
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()?.eventDate).toBe('2026-11-13T00:15:00.000Z');
    });

    it('should keep the last instant while the day or time is cleared', () => {
      component.form.controls.eventTime.setValue(null);
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()).not.toHaveProperty('eventDate');
      expect(component.form.controls.eventTime.hasError('required')).toBe(true);
    });

    it('should pass the draft on at once when the form is submitted', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));
      component.form.controls.details.setValue('Bring a clock.');

      await component.onSubmit();

      expect(lastDraft()).toEqual(expect.objectContaining({ details: 'Bring a clock.' }));
    });

    it('should pass the draft on at once when focus leaves a field', () => {
      component.form.controls.title.setValue('Quick exit');

      query(fixture.debugElement, 'form').triggerEventHandler('focusout');

      expect(lastDraft()).toEqual(expect.objectContaining({ title: 'Quick exit' }));
    });
  });

  describe('validation', () => {
    beforeEach(() => render());

    it('should require every field but the article ID', () => {
      component.form.setValue({
        eventDay: null,
        eventTime: null,
        title: '',
        details: '',
        type: formData.type,
        articleId: '',
      });

      expect(component.form.controls.eventDay.hasError('required')).toBe(true);
      expect(component.form.controls.eventTime.hasError('required')).toBe(true);
      expect(component.form.controls.title.hasError('required')).toBe(true);
      expect(component.form.controls.details.hasError('required')).toBe(true);
      expect(component.form.controls.articleId.valid).toBe(true);
    });

    it('should limit the length of the title and details', () => {
      component.form.patchValue({ title: 'a'.repeat(101), details: 'b'.repeat(201) });

      expect(component.form.controls.title.hasError('maxlength')).toBe(true);
      expect(component.form.controls.details.hasError('maxlength')).toBe(true);
    });

    it('should accept any text a person might type, emoji included', () => {
      component.form.patchValue({ title: 'Rapid 🔥 night', details: 'Café, 7–9 PM' });

      expect(component.form.controls.title.valid).toBe(true);
      expect(component.form.controls.details.valid).toBe(true);
    });

    it('should accept only a full article ID', () => {
      component.form.controls.articleId.setValue('6a7f6f69f983bd7b3881d3e6');
      const full = component.form.controls.articleId.valid;

      component.form.controls.articleId.setValue('6a7f6f69');

      expect(full).toBe(true);
      expect(component.form.controls.articleId.hasError('invalidId')).toBe(true);
    });

    it("should explain the app's own validation errors under the field", async () => {
      component.form.controls.articleId.setValue('6a7f6f69');
      component.form.controls.articleId.markAsTouched();

      await settle();

      expect(errorTexts()).toEqual([FORM_ERROR_MESSAGES['invalidId']]);
    });
  });

  describe('restoring', () => {
    const originalEvent = MOCK_EVENTS[4];

    beforeEach(() => {
      render({ ...formData, title: 'Changed title' }, true, originalEvent);
      component.form.markAllAsTouched();
    });

    it('should put the original event back', () => {
      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');

      expect(restoreSpy).toHaveBeenCalledWith(originalEvent.id);
      expect(component.form.controls.title.value).toBe(originalEvent.title);
      expect(component.form.touched).toBe(false);
    });

    it('should empty a new event back to its starting values', () => {
      fixture.destroy();
      render({ ...formData, title: 'Changed title' }, true, null);

      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');

      expect(restoreSpy).toHaveBeenCalledWith(null);
      expect(component.form.controls.title.value).toBe(INITIAL_EVENT_FORM_DATA.title);
    });
  });

  describe('submitting', () => {
    it('should show every error instead of asking to save an invalid form', async () => {
      render({ ...formData, title: '' }, true);

      await component.onSubmit();
      await settle();

      expect(component.form.controls.title.touched).toBe(true);
      expect(errorTexts()).toHaveLength(1);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should add a new event from the confirmation dialog', async () => {
      render(formData, true, null);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Add ${formData.title} to schedule?`,
          confirmButtonText: 'Add',
        }),
      );
      expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, expect.anything());
      expect(storeRequestSpy).toHaveBeenCalledWith(EventsActions.addEventRequested(), [
        EventsActions.addEventSucceeded,
        EventsActions.addEventFailed,
      ]);
    });

    it('should update an existing event from the confirmation dialog', async () => {
      render(formData, true, MOCK_EVENTS[2]);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: `Update ${MOCK_EVENTS[2].title} event?`,
          confirmButtonText: 'Update',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        EventsActions.updateEventRequested({ eventId: MOCK_EVENTS[2].id }),
        [EventsActions.updateEventSucceeded, EventsActions.updateEventFailed],
      );
    });

    it('should save nothing until the dialog is confirmed', async () => {
      render(formData, true, null);
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('should show who created and edited an existing event only', () => {
      render(formData, false, MOCK_EVENTS[0]);
      const forExisting = query(fixture.debugElement, 'lcc-modification-info');
      fixture.destroy();

      render(formData, false, null);

      expect(forExisting).toBeTruthy();
      expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
    });

    it('should only offer to discard or save once something has changed', () => {
      render(formData, false);
      const restoreWithout = button('.restore-button').disabled();
      const submitWithout = button('.submit-button').disabled();
      fixture.destroy();

      render(formData, true);

      expect(restoreWithout).toBe(true);
      expect(submitWithout).toBe(true);
      expect(button('.restore-button').disabled()).toBe(false);
      expect(button('.submit-button').disabled()).toBe(false);
    });

    it('should disable the save button while the form is invalid', () => {
      render({ ...formData, title: '' }, true);

      expect(button('.submit-button').disabled()).toBe(true);
    });

    it('should cancel from the cancel button', () => {
      render();

      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should label the save button for adding or updating', () => {
      render(formData, true, null);
      const adding = query(fixture.debugElement, '.submit-button').nativeElement
        .textContent;
      fixture.destroy();

      render(formData, true, MOCK_EVENTS[0]);

      expect(adding.trim()).toBe('Add event');
      expect(
        query(fixture.debugElement, '.submit-button').nativeElement.textContent.trim(),
      ).toBe('Update event');
    });
  });
});
