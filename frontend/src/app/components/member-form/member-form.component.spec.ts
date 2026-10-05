import { ButtonComponent, DialogService, TooltipDirective } from '@eagami/ui';
import { provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';

import { TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { INITIAL_MEMBER_FORM_DATA, MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { Member, MemberFormData } from '@app/models';
import { StoreRequestService } from '@app/services';
import { MembersActions } from '@app/store/members';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import {
  closedDialogRef,
  lastOpenedDialog,
  query,
  queryTextContent,
  toDayString,
} from '@app/utils';

import { MemberFormComponent } from './member-form.component';

describe('MemberFormComponent', () => {
  let fixture: ComponentFixture<MemberFormComponent>;
  let component: MemberFormComponent;

  let cancelSpy: MockInstance;
  let changeSpy: MockInstance;
  let dialogOpenSpy: Mock;
  let restoreSpy: MockInstance;
  let storeRequestSpy: Mock;

  // Midnight on February 15, 2019 in London, Ontario
  const dateJoined = '2019-02-15T05:00:00.000Z';
  const withAccount: Member = { ...MOCK_MEMBERS[0], dateJoined };
  const withoutAccount: Member = { ...MOCK_MEMBERS[2], dateJoined };
  const formData: MemberFormData = {
    ...pick(MOCK_MEMBERS[1], MEMBER_FORM_DATA_PROPERTIES),
    dateJoined,
  };

  function render(
    data: MemberFormData = formData,
    hasUnsavedChanges = false,
    originalMember: Member | null = null,
    isSafeMode = false,
  ): void {
    fixture = TestBed.createComponent(MemberFormComponent);
    component = fixture.componentInstance;
    cancelSpy = vi.spyOn(component.cancel, 'emit');
    changeSpy = vi.spyOn(component.change, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');

    fixture.componentRef.setInput('formData', data);
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('isSafeMode', isSafeMode);
    fixture.componentRef.setInput('originalMember', originalMember);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const lastDraft = (): Partial<MemberFormData> => changeSpy.mock.lastCall?.[0].formData;

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const tooltipOf = (selector: string): string | TemplateRef<unknown> =>
    query(fixture.debugElement, selector).injector.get(TooltipDirective).eaTooltip();

  const errorTexts = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="alert"]')).map(
      element => element.textContent?.trim() ?? '',
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberFormComponent],
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
    it('should fill each field from the form data, reading the day joined on the club clock', () => {
      render();

      const { dateJoined: day, ...fields } = component.form.getRawValue();
      expect(toDayString(day!)).toBe('2019-02-15');
      expect(fields).toEqual(pick(formData, Object.keys(fields)));
    });

    it('should start a fresh form without any errors showing', async () => {
      render({ ...INITIAL_MEMBER_FORM_DATA });

      await settle();

      expect(component.form.invalid).toBe(true);
      expect(component.form.touched).toBe(false);
      expect(errorTexts()).toEqual([]);
    });

    it('should show the errors of a restored draft straight away', async () => {
      render({ ...formData, firstName: '' }, true);

      await settle();

      expect(component.form.controls.firstName.touched).toBe(true);
      expect(errorTexts()).toHaveLength(1);
    });

    it('should pass the draft to the store as soon as the form opens', () => {
      render();

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledWith({ memberId: null, formData });
    });

    it('should not count opening a member as an edit, whatever time of day they joined', () => {
      const afternoon = '2019-02-15T18:42:00.000Z';

      render({ ...formData, dateJoined: afternoon }, false, {
        ...withoutAccount,
        dateJoined: afternoon,
      });

      expect(lastDraft()?.dateJoined).toBe(afternoon);
    });

    it("should leave an account holder's email address to their account", () => {
      render(pick(withAccount, MEMBER_FORM_DATA_PROPERTIES), false, withAccount);

      expect(component.form.controls.email.disabled).toBe(true);
      expect(lastDraft()?.email).toBe(withAccount.email);
    });
  });

  describe('keeping the draft', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      render(formData, false, withoutAccount);
      changeSpy.mockClear();
    });

    afterEach(() => vi.useRealTimers());

    it('should pass changes on once typing pauses', () => {
      component.form.controls.city.setValue('Kom');
      component.form.controls.city.setValue('Komoka');
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE - 1);
      const beforePause = changeSpy.mock.calls.length;

      vi.advanceTimersByTime(1);

      expect(beforePause).toBe(0);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledWith({
        memberId: withoutAccount.id,
        formData: expect.objectContaining({ city: 'Komoka', dateJoined }),
      });
    });

    it('should save a newly picked day as midnight on the club clock', () => {
      component.form.controls.dateJoined.setValue(new Date(2020, 6, 20));
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()?.dateJoined).toBe('2020-07-20T04:00:00.000Z');
    });

    it('should go back to the saved instant when the original day is picked again', () => {
      component.form.controls.dateJoined.setValue(new Date(2020, 6, 20));
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      component.form.controls.dateJoined.setValue(new Date(2019, 1, 15));
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()?.dateJoined).toBe(dateJoined);
    });

    it('should keep the last day joined while the field is cleared', () => {
      component.form.controls.dateJoined.setValue(null);
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()).not.toHaveProperty('dateJoined');
      expect(component.form.controls.dateJoined.hasError('required')).toBe(true);
    });

    it('should pass the draft on at once when the form is submitted', async () => {
      dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));
      component.form.controls.city.setValue('Strathroy');

      await component.onSubmit();

      expect(lastDraft()).toEqual(expect.objectContaining({ city: 'Strathroy' }));
    });

    it('should pass the draft on at once when focus leaves a field', () => {
      component.form.controls.city.setValue('Komoka');

      query(fixture.debugElement, 'form').triggerEventHandler('focusout');

      expect(lastDraft()).toEqual(expect.objectContaining({ city: 'Komoka' }));
    });
  });

  describe('validation', () => {
    beforeEach(() => render());

    it('should require the name, city, rating and day joined, as the club records need them', () => {
      component.form.patchValue({
        firstName: '',
        lastName: '',
        city: '',
        rating: '',
        dateJoined: null,
        email: '',
        phoneNumber: '',
        yearOfBirth: '',
        chessComUsername: '',
        lichessUsername: '',
      });

      const { controls } = component.form;
      expect(controls.firstName.hasError('required')).toBe(true);
      expect(controls.lastName.hasError('required')).toBe(true);
      expect(controls.city.hasError('required')).toBe(true);
      expect(controls.rating.hasError('required')).toBe(true);
      expect(controls.dateJoined.hasError('required')).toBe(true);
      expect(controls.email.valid).toBe(true);
      expect(controls.phoneNumber.valid).toBe(true);
      expect(controls.yearOfBirth.valid).toBe(true);
      expect(controls.chessComUsername.valid).toBe(true);
      expect(controls.lichessUsername.valid).toBe(true);
    });

    it('should accept any text a person might type, emoji included', () => {
      component.form.patchValue({
        firstName: 'Żaneta 🔥',
        lastName: "O'Brien",
        city: 'Ōtaki',
      });

      expect(component.form.controls.firstName.valid).toBe(true);
      expect(component.form.controls.lastName.valid).toBe(true);
      expect(component.form.controls.city.valid).toBe(true);
    });

    it('should accept an established or a provisional rating only', () => {
      component.form.controls.rating.setValue('1500/7');
      const provisional = component.form.controls.rating.valid;

      component.form.controls.rating.setValue('15OO');

      expect(provisional).toBe(true);
      expect(component.form.controls.rating.hasError('invalidRating')).toBe(true);
    });

    it('should accept the phone numbers and usernames members can save on their account', () => {
      component.form.patchValue({
        phoneNumber: '(519) 555-1234',
        chessComUsername: 'Magnus_Carlsen',
        lichessUsername: 'DrNykterstein',
      });

      expect(component.form.controls.phoneNumber.valid).toBe(true);
      expect(component.form.controls.chessComUsername.valid).toBe(true);
      expect(component.form.controls.lichessUsername.valid).toBe(true);
    });

    it('should reject the phone numbers and usernames members could not save either', () => {
      component.form.patchValue({
        phoneNumber: 'call after 6',
        chessComUsername: 'magnus carlsen',
        lichessUsername: 'x',
      });

      expect(component.form.controls.phoneNumber.hasError('pattern')).toBe(true);
      expect(component.form.controls.chessComUsername.hasError('pattern')).toBe(true);
      expect(component.form.controls.lichessUsername.hasError('pattern')).toBe(true);
    });

    it('should reject a malformed email address or an impossible year of birth', () => {
      component.form.patchValue({ email: 'magnus@', yearOfBirth: '1850' });

      expect(component.form.controls.email.hasError('email')).toBe(true);
      expect(component.form.controls.yearOfBirth.hasError('invalidYearOfBirth')).toBe(
        true,
      );
    });

    it("should explain the app's own validation errors under the field", async () => {
      component.form.controls.rating.setValue('15OO');
      component.form.controls.rating.markAsTouched();

      await settle();

      expect(errorTexts()).toEqual([FORM_ERROR_MESSAGES['invalidRating']]);
    });

    it('should explain the phone number rule members see on their account', async () => {
      component.form.controls.phoneNumber.setValue('call after 6');
      component.form.controls.phoneNumber.markAsTouched();

      await settle();

      expect(errorTexts()).toEqual([MEMBER_DETAIL_RULES.phoneNumber.message]);
    });
  });

  describe('restoring', () => {
    it('should put the original member back', () => {
      render({ ...formData, city: 'Changed city' }, true, withoutAccount);
      component.form.markAllAsTouched();

      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');

      expect(restoreSpy).toHaveBeenCalledWith(withoutAccount.id);
      expect(component.form.controls.city.value).toBe(withoutAccount.city);
      expect(toDayString(component.form.controls.dateJoined.value!)).toBe('2019-02-15');
      expect(component.form.touched).toBe(false);
    });

    it('should empty a new member back to its starting values', () => {
      render({ ...formData, firstName: 'Imogen' }, true, null);

      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');

      expect(restoreSpy).toHaveBeenCalledWith(null);
      expect(component.form.controls.firstName.value).toBe('');
      expect(component.form.controls.city.value).toBe(INITIAL_MEMBER_FORM_DATA.city);
      expect(component.form.controls.rating.value).toBe(INITIAL_MEMBER_FORM_DATA.rating);
    });
  });

  describe('submitting', () => {
    it('should show every error instead of asking to save an invalid form', async () => {
      render({ ...INITIAL_MEMBER_FORM_DATA, firstName: 'Imogen' });
      await settle();
      const errorsBefore = errorTexts();

      await component.onSubmit();
      await settle();

      expect(errorsBefore).toEqual([]);
      expect(component.form.controls.lastName.touched).toBe(true);
      expect(errorTexts()).toHaveLength(1);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should add a new member and email them from the confirmation dialog', async () => {
      render(formData, true, null);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, expect.anything());
      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: 'Add Hikaru Nakamura and email them their login details?',
          confirmButtonText: 'Add',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.addMemberRequested({ notifyMember: true }),
        [MembersActions.addMemberSucceeded, MembersActions.addMemberFailed],
      );
    });

    it('should name a new member as the form spells them, even before the draft catches up', async () => {
      render(formData, true, null);
      component.form.controls.firstName.setValue('Hikaru-san');

      await component.onSubmit();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        'Add Hikaru-san Nakamura and email them their login details?',
      );
    });

    it('should create the account of an existing member from the confirmation dialog', async () => {
      render(pick(withoutAccount, MEMBER_FORM_DATA_PROPERTIES), true, withoutAccount);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy)).toEqual(
        expect.objectContaining({
          body: 'Update Judit Polgar, create their account and email them their login details?',
          confirmButtonText: 'Update',
        }),
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.updateMemberRequested({
          memberId: withoutAccount.id,
          notifyMember: true,
        }),
        [MembersActions.updateMemberSucceeded, MembersActions.updateMemberFailed],
      );
    });

    it('should email an account holder the changes from the confirmation dialog', async () => {
      render(pick(withAccount, MEMBER_FORM_DATA_PROPERTIES), true, withAccount);

      await component.onSubmit();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        'Update Magnus Carlsen and email them the changes?',
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

  describe('notify member checkbox', () => {
    beforeEach(() => render(formData, true, withoutAccount));

    it('should be offered and ticked when the member has an email address and year of birth', () => {
      expect(component.notifyMember.enabled).toBe(true);
      expect(component.notifyMember.value).toBe(true);
    });

    it('should be withdrawn without an email address', () => {
      component.form.controls.email.setValue('');

      expect(component.notifyMember.disabled).toBe(true);
      expect(component.notifyMember.value).toBe(false);
    });

    it('should be withdrawn with an invalid year of birth', () => {
      component.form.controls.yearOfBirth.setValue('19');

      expect(component.notifyMember.disabled).toBe(true);
      expect(component.notifyMember.value).toBe(false);
    });

    it('should be ticked again once the missing details are filled in', () => {
      component.form.controls.email.setValue('');

      component.form.controls.email.setValue('judit@example.com');

      expect(component.notifyMember.enabled).toBe(true);
      expect(component.notifyMember.value).toBe(true);
    });

    it("should keep the admin's choice not to email while the details stay valid", () => {
      component.notifyMember.setValue(false);

      component.form.controls.yearOfBirth.setValue('1977');

      expect(component.notifyMember.value).toBe(false);
    });

    it('should save the choice not to email an edited member', async () => {
      component.notifyMember.setValue(false);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe('Update Judit Polgar?');
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.updateMemberRequested({
          memberId: withoutAccount.id,
          notifyMember: false,
        }),
        [MembersActions.updateMemberSucceeded, MembersActions.updateMemberFailed],
      );
    });

    it('should explain what emailing needs while it is withdrawn', async () => {
      fixture.destroy();
      render({ ...formData, email: '' }, true, withoutAccount);

      await settle();

      expect(tooltipOf('.notify-member')).toBe(
        'Add a valid email address and year of birth to email the member.',
      );
    });

    it('should offer to create the account of a member without one', () => {
      expect(queryTextContent(fixture.debugElement, '.notify-member')).toBe(
        "Create the member's account and email them their login details",
      );
    });

    it('should offer to email the changes to a member with an account', () => {
      fixture.destroy();

      render(pick(withAccount, MEMBER_FORM_DATA_PROPERTIES), true, withAccount);

      expect(queryTextContent(fixture.debugElement, '.notify-member')).toBe(
        'Email the member about these changes',
      );
    });

    it('should not be shown when adding a member, who is always emailed if possible', async () => {
      fixture.destroy();
      render({ ...formData, email: '' }, true, null);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(query(fixture.debugElement, '.notify-member')).toBeFalsy();
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.addMemberRequested({ notifyMember: false }),
        [MembersActions.addMemberSucceeded, MembersActions.addMemberFailed],
      );
    });
  });

  describe('template', () => {
    it('should only offer to mark an existing member inactive', () => {
      render(formData, false, withoutAccount);
      const forExisting = query(fixture.debugElement, 'label[for="is-active-input"]');
      fixture.destroy();

      render(formData, false, null);

      expect(forExisting).toBeTruthy();
      expect(query(fixture.debugElement, 'label[for="is-active-input"]')).toBeFalsy();
    });

    it('should hide personal details behind a notice in safe mode', () => {
      render(formData, false, withoutAccount, true);

      expect(queryTextContent(fixture.debugElement, '.safe-mode-notice')).toContain(
        'You can disable Safe Mode from the User Settings menu.',
      );
      expect(query(fixture.debugElement, 'label[for="phone-number-input"]')).toBeFalsy();
      expect(query(fixture.debugElement, 'input[type="email"]')).toBeFalsy();
    });

    it('should show personal details outside safe mode', () => {
      render(formData, false, withoutAccount, false);

      expect(query(fixture.debugElement, '.safe-mode-notice')).toBeFalsy();
      expect(query(fixture.debugElement, 'label[for="phone-number-input"]')).toBeTruthy();
      expect(query(fixture.debugElement, 'input[type="email"]')).toBeTruthy();
    });

    it("should explain why an account holder's email address cannot be changed", () => {
      render(pick(withAccount, MEMBER_FORM_DATA_PROPERTIES), false, withAccount);

      expect(tooltipOf('ea-input[type="email"]')).toBe(
        "This email address is managed by the member's account.",
      );
    });

    it('should show who created and edited an existing member only', () => {
      render(formData, false, withoutAccount);
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
      render({ ...formData, lastName: '' }, true);

      expect(button('.submit-button').disabled()).toBe(true);
    });

    it('should cancel from the cancel button', () => {
      render();

      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should label the save button for adding or updating', () => {
      render(formData, true, null);
      const adding = queryTextContent(fixture.debugElement, '.submit-button');
      fixture.destroy();

      render(formData, true, withoutAccount);

      expect(adding).toBe('Add member');
      expect(queryTextContent(fixture.debugElement, '.submit-button')).toBe(
        'Update member',
      );
    });
  });
});
