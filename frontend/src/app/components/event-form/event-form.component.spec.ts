import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EVENT_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DialogService } from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { query } from '@app/utils';
import { generateId } from '@app/utils/common/generate-id.util';

import { EventFormComponent } from './event-form.component';

describe('EventFormComponent', () => {
  let fixture: ComponentFixture<EventFormComponent>;
  let component: EventFormComponent;

  let dialogService: DialogService;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: MockInstance;
  let initFormSpy: MockInstance;
  let initFormValueChangeListenerSpy: MockInstance;
  let requestAddEventSpy: MockInstance;
  let requestUpdateEventSpy: MockInstance;
  let restoreSpy: MockInstance;
  let submitSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFormComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        FormBuilder,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventFormComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    // @ts-expect-error Private class member
    initFormSpy = vi.spyOn(component, 'initForm');
    initFormValueChangeListenerSpy = vi.spyOn(
      component,
      // @ts-expect-error Private class member
      'initFormValueChangeListener',
    );
    requestAddEventSpy = vi.spyOn(component.requestAddEvent, 'emit');
    requestUpdateEventSpy = vi.spyOn(component.requestUpdateEvent, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');
    submitSpy = vi.spyOn(component, 'onSubmit');

    component.formData = pick(MOCK_EVENTS[0], EVENT_FORM_DATA_PROPERTIES);
    component.hasUnsavedChanges = false;
    component.originalEvent = null;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    describe('handling form data', () => {
      describe('if form has unsaved changes', () => {
        beforeEach(() => {
          vi.useFakeTimers();

          fixture.componentRef.setInput('formData', {
            ...pick(MOCK_EVENTS[1], EVENT_FORM_DATA_PROPERTIES),
            eventDate: '2000-01-01T16:00:00.000Z',
          });
          fixture.componentRef.setInput('hasUnsavedChanges', true);
          fixture.componentRef.setInput('originalEvent', null);
          component.ngOnInit();

          component.form.patchValue({
            articleId: '',
            eventTime: '6:00 pm',
          });
          fixture.detectChanges();

          vi.clearAllMocks();
          component.ngOnInit();
        });

        afterEach(() => vi.useRealTimers());

        it('should emit change event with converted values', () => {
          // Run debounce timer to trigger the valueChanges subscription
          vi.runAllTimers();
          expect(changeSpy).toHaveBeenCalled();
        });

        it('should initialize the form with touched values from formData', () => {
          expect(initFormSpy).toHaveBeenCalledTimes(1);
          expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);

          for (const property of EVENT_FORM_DATA_PROPERTIES) {
            expect(component.form.controls[property].value).toBe(
              component.formData[property],
            );
            expect(component.form.controls[property].touched).toBe(true);
          }
        });
      });

      describe('if form does not have unsaved changes', () => {
        beforeEach(() => {
          vi.useFakeTimers();

          fixture.componentRef.setInput(
            'formData',
            pick(MOCK_EVENTS[2], EVENT_FORM_DATA_PROPERTIES),
          );
          fixture.componentRef.setInput('hasUnsavedChanges', false);
          fixture.componentRef.setInput('originalEvent', MOCK_EVENTS[1]);
          component.ngOnInit();

          component.form.patchValue({
            articleId: '',
            eventTime: '6:00 pm',
          });
          fixture.detectChanges();

          vi.clearAllMocks();
          component.ngOnInit();
        });

        it('should emit change event with converted values', () => {
          // Run debounce timer to trigger the valueChanges subscription
          vi.runAllTimers();
          expect(changeSpy).toHaveBeenCalled();
        });

        it('should initialize the form with untouched values from formData', () => {
          expect(initFormSpy).toHaveBeenCalledTimes(1);
          expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);

          for (const property of EVENT_FORM_DATA_PROPERTIES) {
            expect(component.form.controls[property].value).toBe(
              component.formData[property],
            );
            expect(component.form.controls[property].untouched).toBe(true);
          }
        });
      });
    });
  });

  describe('form validation', () => {
    describe('required validator', () => {
      it('should mark empty field as invalid', () => {
        component.form.patchValue({ title: '' }); // Invalid - title field is required
        fixture.detectChanges();

        expect(component.form.controls.title.hasError('required')).toBe(true);
      });

      it('should mark non-empty field as valid', () => {
        component.form.patchValue({ title: '1000' });
        fixture.detectChanges();

        expect(component.form.controls.title.hasError('required')).toBe(false);
      });
    });

    describe('text validator', () => {
      it('should mark field with whitespace-only text as valid', () => {
        component.form.patchValue({
          title: ' ',
        });
        fixture.detectChanges();

        expect(component.form.controls.title.hasError('invalidText')).toBe(false);
      });

      it('should mark field with emoji as valid', () => {
        component.form.patchValue({
          title: '🔥',
          details: '123',
        });
        fixture.detectChanges();

        expect(component.form.controls.title.hasError('invalidText')).toBe(false);
        expect(component.form.controls.details.hasError('invalidText')).toBe(false);
      });
    });
  });

  describe('onRestore', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('hasUnsavedChanges', true);
      fixture.componentRef.setInput('originalEvent', MOCK_EVENTS[4]);
      fixture.detectChanges();

      component.ngOnInit();

      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => vi.useRealTimers());

    it('should emit both change and restore events and re-initialize form if dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');

      await component.onRestore();
      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: 'Restore original event data? All changes will be lost.',
            confirmButtonText: 'Restore',
            confirmButtonType: 'warning',
          },
        },
      });

      expect(changeSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalledWith(MOCK_EVENTS[4].id);
      expect(initFormSpy).toHaveBeenCalledTimes(1);
      expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit change or restore event or re-initialize form if dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onRestore();
      vi.runAllTimers();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).not.toHaveBeenCalled();
      expect(restoreSpy).not.toHaveBeenCalled();
      expect(initFormSpy).not.toHaveBeenCalled();
      expect(initFormValueChangeListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    it('should emit cancel event', () => {
      component.onCancel();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    it('should mark all fields as touched if form is invalid on submit', async () => {
      component.form.patchValue({ title: '' }); // Invalid - title field is required
      component.form.markAsPristine();
      component.form.markAsUntouched();
      fixture.detectChanges();

      await component.onSubmit();

      expect(component.form.controls.title.touched).toBe(true);
      expect(component.form.touched).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct data and emit request add event if adding a new event', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_EVENTS[3], EVENT_FORM_DATA_PROPERTIES),
      );
      fixture.componentRef.setInput('originalEvent', null);
      fixture.detectChanges();

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Add ${component.formData.title} to schedule?`,
            confirmButtonText: 'Add',
          },
        },
      });
      expect(requestAddEventSpy).toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct data and emit request update event if updating an event', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_EVENTS[3], EVENT_FORM_DATA_PROPERTIES),
      );
      fixture.componentRef.setInput('originalEvent', MOCK_EVENTS[2]);
      fixture.detectChanges();

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Update ${component.originalEvent!.title} event?`,
            confirmButtonText: 'Update',
          },
        },
      });
      expect(requestUpdateEventSpy).toHaveBeenCalledWith(MOCK_EVENTS[2].id);
    });

    it('should not emit add or update events if dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_EVENTS[3], EVENT_FORM_DATA_PROPERTIES),
      );
      fixture.componentRef.setInput('originalEvent', null);
      fixture.detectChanges();

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(requestAddEventSpy).not.toHaveBeenCalled();
      expect(requestUpdateEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    describe('modification info', () => {
      it('should render if originalEvent is defined', () => {
        fixture.componentRef.setInput('originalEvent', MOCK_EVENTS[0]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeTruthy();
      });

      it('should not render if originalEvent is null', () => {
        fixture.componentRef.setInput('originalEvent', null);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeFalsy();
      });
    });

    describe('restore button', () => {
      it('should be disabled if there are no unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.restore-button').nativeElement.disabled,
        ).toBe(true);
      });

      it('should be enabled if there are unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.restore-button').nativeElement.disabled,
        ).toBe(false);
      });
    });

    describe('cancel button', () => {
      it('should be enabled if there are unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        const cancelButton = query(fixture.debugElement, '.cancel-button');
        cancelButton.triggerEventHandler('click');

        expect(cancelButton.nativeElement.disabled).toBe(false);
        expect(cancelSpy).toHaveBeenCalledTimes(1);
      });

      it('should also be enabled if there are no unsaved changes', () => {
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();

        const cancelButton = query(fixture.debugElement, '.cancel-button');
        cancelButton.triggerEventHandler('click');

        expect(cancelButton.nativeElement.disabled).toBe(false);
        expect(cancelSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('submit button', () => {
      it('should be disabled if there are no unsaved changes', () => {
        component.form.setValue({
          ...pick(MOCK_EVENTS[3], EVENT_FORM_DATA_PROPERTIES),
          articleId: generateId(24),
          eventTime: '6:00 pm',
        });
        component.hasUnsavedChanges = false;
        fixture.detectChanges();

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(true);
      });

      it('should be disabled if the form is invalid', () => {
        component.form.setValue({
          ...pick(MOCK_EVENTS[3], EVENT_FORM_DATA_PROPERTIES),
          articleId: generateId(24),
          eventTime: '6:00pm', // Invalid - unsupported time format
        });
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(true);
      });

      it('should be enabled if there are unsaved changes and the form is valid', () => {
        component.form.setValue({
          ...pick(MOCK_EVENTS[3], EVENT_FORM_DATA_PROPERTIES),
          articleId: generateId(24),
          eventTime: '6:00 pm',
        });
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        query(fixture.debugElement, 'form').triggerEventHandler('ngSubmit');

        const submitButton = query(fixture.debugElement, '.submit-button');
        expect(submitButton.nativeElement.disabled).toBe(false);
        expect(submitSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
