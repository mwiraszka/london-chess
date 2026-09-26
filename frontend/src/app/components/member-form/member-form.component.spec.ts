import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { DialogService, StoreRequestService } from '@app/services';
import { MembersActions } from '@app/store/members';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { lastOpenedDialog, query, queryTextContent } from '@app/utils';

import { MemberFormComponent } from './member-form.component';

describe('MemberFormComponent', () => {
  let fixture: ComponentFixture<MemberFormComponent>;
  let component: MemberFormComponent;

  let dialogService: DialogService;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: MockInstance;
  let initFormSpy: MockInstance;
  let initFormValueChangeListenerSpy: MockInstance;
  let storeRequestSpy: Mock;
  let restoreSpy: MockInstance;
  let submitSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberFormComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        FormBuilder,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberFormComponent);
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
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    restoreSpy = vi.spyOn(component.restore, 'emit');
    submitSpy = vi.spyOn(component, 'onSubmit');

    fixture.componentRef.setInput(
      'formData',
      pick(MOCK_MEMBERS[0], MEMBER_FORM_DATA_PROPERTIES),
    );
    fixture.componentRef.setInput('hasUnsavedChanges', false);
    fixture.componentRef.setInput('isSafeMode', false);
    fixture.componentRef.setInput('originalMember', null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    describe('handling form data', () => {
      describe('if form has unsaved changes', () => {
        beforeEach(() => {
          fixture.componentRef.setInput('hasUnsavedChanges', true);

          vi.clearAllMocks();
          component.ngOnInit();
        });

        it('should initialize the form with touched values from formData', () => {
          expect(initFormSpy).toHaveBeenCalledTimes(1);
          expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);

          for (const property of MEMBER_FORM_DATA_PROPERTIES) {
            expect(component.form.controls[property].value).toBe(
              component.formData()[property],
            );
            expect(component.form.controls[property].touched).toBe(true);
          }
        });
      });

      describe('if form does not have unsaved changes', () => {
        beforeEach(() => {
          fixture.componentRef.setInput('hasUnsavedChanges', false);

          vi.clearAllMocks();
          component.ngOnInit();
        });

        it('should initialize the form with untouched values from formData', () => {
          expect(initFormSpy).toHaveBeenCalledTimes(1);
          expect(initFormValueChangeListenerSpy).toHaveBeenCalledTimes(1);

          for (const property of MEMBER_FORM_DATA_PROPERTIES) {
            expect(component.form.controls[property].value).toBe(
              component.formData()[property],
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
        component.form.patchValue({ firstName: '' });
        fixture.detectChanges();

        expect(component.form.controls.firstName.hasError('required')).toBe(true);
      });

      it('should mark non-empty field as valid', () => {
        component.form.patchValue({ rating: '1000' });
        fixture.detectChanges();

        expect(component.form.controls.rating.hasError('required')).toBe(false);
      });
    });

    describe('text validator', () => {
      it('should mark field with whitespace-only text as false', () => {
        component.form.patchValue({
          firstName: ' ',
          city: '  ',
        });
        fixture.detectChanges();

        expect(component.form.controls.firstName.hasError('invalidText')).toBe(false);
        expect(component.form.controls.city.hasError('invalidText')).toBe(false);
      });

      it('should mark field with emoji as valid', () => {
        component.form.patchValue({
          firstName: '🔥',
          lastName: 'abc',
          city: '123',
        });
        fixture.detectChanges();

        expect(component.form.controls.firstName.hasError('invalidText')).toBe(false);
        expect(component.form.controls.lastName.hasError('invalidText')).toBe(false);
        expect(component.form.controls.city.hasError('invalidText')).toBe(false);
      });
    });
  });

  describe('onRestore', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('hasUnsavedChanges', true);
      fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[4]);

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
            body: 'Restore original member data? All changes will be lost.',
            confirmButtonText: 'Restore',
            confirmButtonType: 'warning',
          },
        },
      });

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(restoreSpy).toHaveBeenCalledWith(MOCK_MEMBERS[4].id);
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
      component.form.patchValue({ rating: '' }); // Invalid - rating field is required
      component.form.markAsPristine();
      component.form.markAsUntouched();
      fixture.detectChanges();

      await component.onSubmit();

      expect(component.form.controls.rating.touched).toBe(true);
      expect(component.form.touched).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should add a new member from the confirmation dialog', async () => {
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_MEMBERS[3], MEMBER_FORM_DATA_PROPERTIES),
      );
      fixture.componentRef.setInput('originalMember', null);

      await component.onSubmit();
      const dialog = lastOpenedDialog(dialogOpenSpy);
      await dialog.confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith(
        expect.objectContaining({ componentType: BasicDialogComponent, isModal: false }),
      );
      expect(dialog).toEqual(
        expect.objectContaining({
          title: 'Confirm',
          body: `Add ${component.formData().firstName} ${component.formData().lastName} and email them their login details?`,
          confirmButtonText: 'Add',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.addMemberRequested({ notifyMember: true }),
        [MembersActions.addMemberSucceeded, MembersActions.addMemberFailed],
      );
    });

    it('should update an existing member from the confirmation dialog', async () => {
      fixture.componentRef.setInput(
        'formData',
        pick(MOCK_MEMBERS[3], MEMBER_FORM_DATA_PROPERTIES),
      );
      fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[2]);

      await component.onSubmit();
      const dialog = lastOpenedDialog(dialogOpenSpy);
      await dialog.confirmAction?.();

      expect(dialog).toEqual(
        expect.objectContaining({
          body: `Update ${MOCK_MEMBERS[2].firstName} ${MOCK_MEMBERS[2].lastName}, create their account and email them their login details?`,
          confirmButtonText: 'Update',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.updateMemberRequested({
          memberId: MOCK_MEMBERS[2].id,
          notifyMember: true,
        }),
        [MembersActions.updateMemberSucceeded, MembersActions.updateMemberFailed],
      );
    });

    it('should not save anything until the dialog is confirmed', async () => {
      fixture.componentRef.setInput('originalMember', null);

      await component.onSubmit();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('notify member checkbox', () => {
    it('should be enabled and checked when the member has an email address and year of birth', () => {
      expect(component.notifyMember.enabled).toBe(true);
      expect(component.notifyMember.value).toBe(true);
    });

    it('should be disabled and unchecked without an email address', () => {
      component.form.controls.email.setValue('');

      expect(component.notifyMember.disabled).toBe(true);
      expect(component.notifyMember.value).toBe(false);
    });

    it('should be disabled and unchecked with an invalid year of birth', () => {
      component.form.controls.yearOfBirth.setValue('19');

      expect(component.notifyMember.disabled).toBe(true);
      expect(component.notifyMember.value).toBe(false);
    });

    it('should be checked again once the missing details are filled in', () => {
      component.form.controls.email.setValue('');

      component.form.controls.email.setValue('magnus@example.com');

      expect(component.notifyMember.enabled).toBe(true);
      expect(component.notifyMember.value).toBe(true);
    });

    it("should keep the admin's choice not to email while the details stay valid", () => {
      component.notifyMember.setValue(false);

      component.form.controls.yearOfBirth.setValue('1991');

      expect(component.notifyMember.value).toBe(false);
    });

    it('should save the choice not to email an edited member', async () => {
      fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[0]);
      component.notifyMember.setValue(false);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.updateMemberRequested({
          memberId: MOCK_MEMBERS[0].id,
          notifyMember: false,
        }),
        [MembersActions.updateMemberSucceeded, MembersActions.updateMemberFailed],
      );
    });

    it('should not be shown when adding a member', () => {
      fixture.componentRef.setInput('originalMember', null);

      fixture.detectChanges();

      expect(query(fixture.debugElement, '.notify-member')).toBeFalsy();
    });

    it('should not email a new member without an email address', async () => {
      component.form.controls.email.setValue('');

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.addMemberRequested({ notifyMember: false }),
        [MembersActions.addMemberSucceeded, MembersActions.addMemberFailed],
      );
    });

    it('should offer to email the changes to a member with an account', () => {
      fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[0]);

      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.notify-member')).toBe(
        'Email the member about these changes',
      );
    });

    it('should offer to create the account for a member without one', () => {
      fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[2]);

      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.notify-member')).toBe(
        "Create the member's account and email them their login details",
      );
    });
  });

  describe('template rendering', () => {
    describe('is-active input', () => {
      it('should render if originalMember is defined', () => {
        fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[0]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '#is-active-input')).toBeTruthy();
      });

      it('should not render if originalMember is null', () => {
        fixture.componentRef.setInput('originalMember', null);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '#is-active-input')).toBeFalsy();
      });
    });

    describe('safe-mode notice', () => {
      it('should render if isSafeMode is true', () => {
        fixture.componentRef.setInput('isSafeMode', true);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-safe-mode-notice')).toBeTruthy();
      });

      it('should not render if isSafeMode is false', () => {
        fixture.componentRef.setInput('isSafeMode', false);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-safe-mode-notice')).toBeFalsy();
      });
    });

    describe('modification info', () => {
      it('should render if originalMember is defined', () => {
        fixture.componentRef.setInput('originalMember', MOCK_MEMBERS[0]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-modification-info')).toBeTruthy();
      });

      it('should not render if originalMember is null', () => {
        fixture.componentRef.setInput('originalMember', null);
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
        component.form.setValue(pick(MOCK_MEMBERS[3], MEMBER_FORM_DATA_PROPERTIES));
        fixture.componentRef.setInput('hasUnsavedChanges', false);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.submit-button').nativeElement.disabled).toBe(
          true,
        );
      });

      it('should be disabled if the form is invalid', () => {
        component.form.setValue({
          ...pick(MOCK_MEMBERS[3], MEMBER_FORM_DATA_PROPERTIES),
          lastName: '', // Invalid - lastName is a required field
        });
        fixture.componentRef.setInput('hasUnsavedChanges', true);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.submit-button').nativeElement.disabled).toBe(
          true,
        );
      });

      it('should be enabled if there are unsaved changes and the form is valid', () => {
        component.form.setValue(pick(MOCK_MEMBERS[3], MEMBER_FORM_DATA_PROPERTIES));
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
