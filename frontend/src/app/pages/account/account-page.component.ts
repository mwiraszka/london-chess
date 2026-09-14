import {
  AlertTriangleIconComponent,
  AvatarEditorComponent,
  type AvatarEditorCropState,
  ButtonComponent,
  CardComponent,
  DialogComponent,
  InputComponent,
  LockIconComponent,
  MonitorIconComponent,
  SettingsIconComponent,
  ShieldIconComponent,
  SkeletonComponent,
  SmartphoneIconComponent,
  ToastService,
  UserIconComponent,
} from '@eagami/ui';
import { map } from 'rxjs';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ChessUsernameFieldsComponent } from '@app/components/chess-username-fields/chess-username-fields.component';
import { NewPasswordFieldsComponent } from '@app/components/new-password-fields/new-password-fields.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PhoneNumberFieldComponent } from '@app/components/phone-number-field/phone-number-field.component';
import { YearOfBirthFieldComponent } from '@app/components/year-of-birth-field/year-of-birth-field.component';
import { ACCOUNT_SECTIONS, SESSION_REFRESH_INTERVAL_MS } from '@app/constants/account';
import {
  AccountSection,
  Member,
  MemberDetailsFormData,
  SessionInfo,
  UserRecord,
  UserSessionRecord,
} from '@app/models';
import {
  ApiError,
  ApiService,
  ClerkService,
  MetaAndTitleService,
  UserService,
} from '@app/services';
import {
  createEmailControl,
  createMemberDetailsControls,
  createNewPasswordGroup,
  isAccountSection,
} from '@app/utils';
import { asSentence } from '@app/utils/sentence.util';

@Component({
  selector: 'lcc-account-page',
  templateUrl: './account-page.component.html',
  styleUrl: './account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertTriangleIconComponent,
    AvatarEditorComponent,
    ButtonComponent,
    CardComponent,
    ChessUsernameFieldsComponent,
    DialogComponent,
    InputComponent,
    LockIconComponent,
    MonitorIconComponent,
    NewPasswordFieldsComponent,
    PageHeaderComponent,
    PhoneNumberFieldComponent,
    ReactiveFormsModule,
    RouterLink,
    ShieldIconComponent,
    SkeletonComponent,
    SmartphoneIconComponent,
    UserIconComponent,
    YearOfBirthFieldComponent,
  ],
})
export class AccountPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly clerk = inject(ClerkService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly userService = inject(UserService);

  private readonly avatarEditor = viewChild(AvatarEditorComponent);

  protected readonly navItems = ACCOUNT_SECTIONS;
  protected readonly pageIcon = SettingsIconComponent;

  private readonly sectionParam = toSignal(
    this.route.paramMap.pipe(map(params => params.get('section'))),
    { initialValue: this.route.snapshot.paramMap.get('section') },
  );
  protected readonly activeSection = computed<AccountSection>(() => {
    const section = this.sectionParam();
    return isAccountSection(section) ? section : 'profile';
  });

  protected readonly avatarLoading = signal(false);
  protected readonly editorSrc = signal<string | undefined>(undefined);
  protected readonly loading = signal(true);
  protected readonly savedCropState = signal<AvatarEditorCropState | null>(null);
  protected readonly saving = signal(false);
  private readonly avatarDirty = signal(false);
  private readonly lastClerkImageUrl = signal<string | undefined>(undefined);
  private readonly liveCropState = signal<AvatarEditorCropState | null>(null);
  private readonly removeAvatar = signal(false);
  private readonly selectedFile = signal<File | null>(null);

  private readonly isCropChanged = computed(() => {
    const saved = this.savedCropState();
    const live = this.liveCropState();
    if (!live) {
      return false;
    }
    if (!saved) {
      return live.zoom !== 1 || live.offsetX !== 0 || live.offsetY !== 0;
    }
    return (
      live.zoom !== saved.zoom ||
      live.offsetX !== saved.offsetX ||
      live.offsetY !== saved.offsetY
    );
  });

  private readonly pendingPhotoChange = computed(
    (): 'upload' | 'remove' | 'crop' | null => {
      if (this.avatarDirty()) {
        if (this.removeAvatar()) {
          return this.userService.hasAvatar() ? 'remove' : null;
        }
        return this.selectedFile() ? 'upload' : null;
      }
      return this.isCropChanged() ? 'crop' : null;
    },
  );

  protected readonly hasPhotoChanges = computed(() => this.pendingPhotoChange() !== null);

  protected readonly detailsForm = new FormGroup(createMemberDetailsControls());
  protected readonly requestingChanges = signal(false);
  private readonly detailsValue = toSignal(
    this.detailsForm.valueChanges.pipe(map(() => this.detailsForm.getRawValue())),
    { initialValue: this.detailsForm.getRawValue() },
  );
  private readonly savedDetails = signal<MemberDetailsFormData>(
    this.detailsForm.getRawValue(),
  );

  protected readonly hasDetailChanges = computed(() => {
    const current = this.detailsValue();
    const saved = this.savedDetails();
    return (
      current.firstName.trim() !== saved.firstName ||
      current.lastName.trim() !== saved.lastName ||
      current.yearOfBirth !== saved.yearOfBirth ||
      current.city.trim() !== saved.city ||
      current.phoneNumber.trim() !== saved.phoneNumber ||
      current.lichessUsername.trim() !== saved.lichessUsername ||
      current.chessComUsername.trim() !== saved.chessComUsername
    );
  });

  protected readonly emailBusy = signal(false);
  protected readonly emailCode = new FormControl('', { nonNullable: true });
  protected readonly emailCodeError = signal('');
  protected readonly emailError = signal('');
  protected readonly emailStep = signal<'idle' | 'verify'>('idle');
  protected readonly newEmail = createEmailControl();
  private readonly email = signal('');
  private readonly newEmailValue = toSignal(this.newEmail.valueChanges, {
    initialValue: this.newEmail.value,
  });
  private pendingEmailId: string | null = null;

  protected readonly canSubmitEmail = computed(() => {
    const newEmail = this.newEmailValue().trim();
    const currentEmail = this.email();
    return newEmail !== currentEmail && this.newEmail.valid;
  });

  protected readonly currentPasswordError = signal('');
  protected readonly hasPassword = computed(() => !!this.clerk.user()?.passwordEnabled);
  protected readonly passwordBusy = signal(false);
  protected readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    passwords: createNewPasswordGroup(),
  });

  protected readonly revokingOthers = signal(false);
  protected readonly sessions = signal<SessionInfo[]>([]);
  protected readonly sessionsLoading = signal(false);
  private sessionsRequested = false;

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleting = signal(false);

  constructor() {
    // A section nobody recognises would otherwise sit on the profile pane while
    // the address bar still claims something else.
    effect(() => {
      if (!isAccountSection(this.sectionParam())) {
        void this.router.navigate(['/account/profile'], { replaceUrl: true });
      }
    });

    // Sessions opened or closed on other devices only surface through Clerk's
    // API, so the list is refreshed on a timer while the tab is watching it
    effect(onCleanup => {
      if (this.activeSection() !== 'security') {
        return;
      }

      if (this.sessionsRequested) {
        void this.refreshSessions();
      } else {
        this.sessionsRequested = true;
        void this.loadSessions();
      }

      const timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void this.refreshSessions();
        }
      }, SESSION_REFRESH_INTERVAL_MS);
      onCleanup(() => clearInterval(timer));
    });

    // The editor's revert control restores the baseline image without emitting,
    // so the pending-photo state has to be dropped here or Save would still
    // offer to upload the abandoned file
    effect(() => {
      if (this.avatarEditor()?.isAtOriginal()) {
        this.selectedFile.set(null);
        this.avatarDirty.set(false);
        this.removeAvatar.set(false);
        this.liveCropState.set(this.savedCropState());
      }
    });

    // Accounts without a password (social log in only) have no current password
    // to confirm, so the field drops out of the form's validity
    effect(() => {
      const currentPassword = this.passwordForm.controls.currentPassword;
      if (this.hasPassword()) {
        currentPassword.enable();
      } else {
        currentPassword.disable();
      }
    });
  }

  ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Account');
    this.metaAndTitleService.updateDescription(
      'Manage your London Chess Club account, profile, and security settings.',
    );

    const user = this.clerk.user();
    this.applySavedDetails({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    });
    this.email.set(user?.primaryEmailAddress?.emailAddress ?? '');
    this.newEmail.reset(this.email());

    this.setCropState(this.userService.avatarCropState());
    this.editorSrc.set(this.userService.avatarUrl());
    this.syncClerkImageUrl();
    this.avatarLoading.set(!this.editorSrc() && !!user?.hasImage);

    void this.loadMemberDetails();

    void this.refreshFromClerk().then(() => {
      this.avatarLoading.set(false);
      this.loading.set(false);
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void this.refreshFromClerk();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  protected onAvatarRejected(message: string): void {
    this.toast.show(asSentence(message), { title: 'Invalid image', variant: 'error' });
  }

  protected onFileSelected(file: File): void {
    this.selectedFile.set(file);
    this.avatarDirty.set(true);
    this.removeAvatar.set(false);
    this.liveCropState.set(null);
  }

  protected onCropStateChange(state: AvatarEditorCropState): void {
    this.liveCropState.set(state);
  }

  protected onRemoveAvatar(): void {
    this.avatarDirty.set(true);
    this.removeAvatar.set(true);
    this.selectedFile.set(null);
  }

  protected async onSavePhoto(): Promise<void> {
    const change = this.pendingPhotoChange();
    if (!change) {
      return;
    }

    this.saving.set(true);

    try {
      if (change === 'upload') {
        await this.uploadPhoto();
      } else if (change === 'remove') {
        await this.removePhoto();
      } else {
        await this.saveCropState();
      }

      this.toast.show('Successfully updated your photo.', {
        title: 'Profile updated',
        variant: 'success',
      });

      this.avatarDirty.set(false);
      this.removeAvatar.set(false);
      this.selectedFile.set(null);
      this.avatarEditor()?.captureOriginal();
    } catch (e: unknown) {
      this.showClerkErrorToast('Profile update failed', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async onRequestChanges(): Promise<void> {
    if (this.detailsForm.invalid) {
      return;
    }

    const {
      firstName,
      lastName,
      yearOfBirth,
      city,
      phoneNumber,
      lichessUsername,
      chessComUsername,
    } = this.detailsForm.getRawValue();

    this.requestingChanges.set(true);

    try {
      await this.api.post('/users/me/member/change-request', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        yearOfBirth: yearOfBirth === null ? '' : String(yearOfBirth),
        city: city.trim(),
        phoneNumber: phoneNumber.trim(),
        lichessUsername: lichessUsername.trim(),
        chessComUsername: chessComUsername.trim(),
      });
      this.toast.show(
        'Your requested changes have been sent for review – an admin will email you once they are made.',
        { title: 'Request sent', variant: 'info' },
      );
    } catch (e: unknown) {
      this.toast.show(
        e instanceof ApiError
          ? asSentence(e.message)
          : 'Unable to send your request – please try again.',
        { title: 'Request failed', variant: 'error' },
      );
    } finally {
      this.requestingChanges.set(false);
    }
  }

  protected async onChangeEmail(): Promise<void> {
    if (!this.canSubmitEmail()) {
      return;
    }

    this.emailError.set('');
    this.emailBusy.set(true);

    try {
      this.pendingEmailId = await this.clerk.createEmail(this.newEmail.value.trim());
      this.emailStep.set('verify');
    } catch (e: unknown) {
      this.emailError.set(this.clerk.extractError(e));
    } finally {
      this.emailBusy.set(false);
    }
  }

  protected async onVerifyEmail(): Promise<void> {
    if (!this.pendingEmailId) {
      return;
    }

    this.emailCodeError.set('');
    this.emailBusy.set(true);

    try {
      await this.clerk.verifyAndSetPrimaryEmail(
        this.pendingEmailId,
        this.emailCode.value.trim(),
      );
      await this.clerk.reloadUser();
      await this.userService.load();
      this.email.set(this.clerk.user()?.primaryEmailAddress?.emailAddress ?? '');
      this.resetEmailChange();
      this.toast.show('Successfully changed your email address.', {
        title: 'Email updated',
        variant: 'success',
      });
    } catch (e: unknown) {
      this.emailCodeError.set(this.clerk.extractError(e));
    } finally {
      this.emailBusy.set(false);
    }
  }

  protected resetEmailChange(): void {
    this.pendingEmailId = null;
    this.emailStep.set('idle');
    this.newEmail.reset(this.email());
    this.emailCode.reset();
    this.emailError.set('');
    this.emailCodeError.set('');
  }

  protected async onChangePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      return;
    }

    const { currentPassword, passwords } = this.passwordForm.getRawValue();
    this.currentPasswordError.set('');
    this.passwordBusy.set(true);

    try {
      await this.api.post('/users/me/password', {
        currentPassword: this.hasPassword() ? currentPassword : undefined,
        newPassword: passwords.newPassword,
      });

      try {
        await this.revokeOtherSessions();
      } catch {
        // non-critical; the password itself changed
      }

      this.passwordForm.reset();
      if (this.sessions().length) {
        void this.loadSessions();
      }
      this.toast.show('Successfully changed your password.', {
        title: 'Password updated',
        variant: 'success',
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && /current password/i.test(e.message)) {
        this.currentPasswordError.set(e.message);
        return;
      }
      this.toast.show(
        asSentence(e instanceof ApiError ? e.message : 'Could not update password'),
        { title: 'Password change failed', variant: 'error' },
      );
    } finally {
      this.passwordBusy.set(false);
    }
  }

  protected async onRevokeOtherSessions(): Promise<void> {
    this.revokingOthers.set(true);

    try {
      await this.revokeOtherSessions();
      await this.loadSessions();
      this.toast.show('Successfully logged out of all your other devices.', {
        title: 'Logout',
        variant: 'success',
      });
    } catch (e: unknown) {
      this.showClerkErrorToast('Logout failed', e);
    } finally {
      this.revokingOthers.set(false);
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    this.deleting.set(true);

    try {
      this.clerk.expectSessionEnd();
      await this.api.delete('/users/me');
      this.deleteDialogOpen.set(false);

      try {
        await this.clerk.logOut();
      } catch {
        // session may already be invalidated
      }

      await this.router.navigate(['/']);
    } catch (e: unknown) {
      this.showClerkErrorToast('Deletion failed', e);
    } finally {
      this.deleting.set(false);
    }
  }

  private applySavedDetails(details: Partial<MemberDetailsFormData>): void {
    this.detailsForm.patchValue(details);
    this.savedDetails.update(saved => ({ ...saved, ...details }));
  }

  private async loadMemberDetails(): Promise<void> {
    try {
      const member = await this.api.get<Member>('/users/me/member');
      this.applySavedDetails({
        yearOfBirth: /^\d{4}$/.test(member.yearOfBirth)
          ? Number(member.yearOfBirth)
          : null,
        city: member.city,
        phoneNumber: member.phoneNumber,
        lichessUsername: member.lichessUsername,
        chessComUsername: member.chessComUsername,
      });
    } catch {
      // Not every account is linked to a club member record
    }
  }

  private async refreshFromClerk(): Promise<void> {
    const previousClerkImageUrl = this.lastClerkImageUrl();

    await this.clerk.reloadUser();
    await this.userService.load();

    const user = this.userService.user();
    if (user) {
      const saved = this.savedDetails();
      if (user.firstName !== saved.firstName) {
        this.applySavedDetails({ firstName: user.firstName });
      }
      if (user.lastName !== saved.lastName) {
        this.applySavedDetails({ lastName: user.lastName });
      }
    }

    this.email.set(this.clerk.user()?.primaryEmailAddress?.emailAddress ?? '');
    this.syncClerkImageUrl();

    // Before the account record loads, the editor may have been seeded with the
    // Clerk fallback (the small circular crop); once the record is in, upgrade to
    // the stored full-size original so re-cropping can reclaim the whole photo
    if (
      this.lastClerkImageUrl() !== previousClerkImageUrl ||
      (!this.avatarDirty() && this.editorSrc() !== this.userService.avatarUrl())
    ) {
      this.editorSrc.set(this.userService.avatarUrl());
      this.setCropState(this.userService.avatarCropState());
    }
  }

  private async uploadPhoto(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    const cropped = await this.exportCrop();
    const cropState = this.liveCropState();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('cropped', cropped, 'cropped.png');
    if (cropState) {
      formData.append('cropState', JSON.stringify(cropState));
    }

    this.userService.setUser(
      await this.api.post<UserRecord>('/users/me/avatar', formData),
    );
    this.setCropState(cropState);
    await this.clerk.reloadUser();
    this.syncClerkImageUrl();
  }

  private async removePhoto(): Promise<void> {
    await this.api.delete('/users/me/avatar');
    this.userService.clearAvatar();
    this.editorSrc.set(undefined);
    this.setCropState(null);
    await this.clerk.reloadUser();
    this.syncClerkImageUrl();
  }

  private async saveCropState(): Promise<void> {
    const cropState = this.liveCropState();
    if (!cropState) {
      return;
    }

    const formData = new FormData();
    formData.append('cropped', await this.exportCrop(), 'cropped.png');
    formData.append('cropState', JSON.stringify(cropState));

    const user = await this.api.patch<UserRecord>('/users/me/avatar', formData);
    this.userService.setUser(user);
    this.lastClerkImageUrl.set(user.clerkImageUrl ?? undefined);
    this.savedCropState.set(cropState);
    await this.clerk.reloadUser();
  }

  private exportCrop(): Promise<Blob> {
    return this.avatarEditor()!.exportCrop();
  }

  private setCropState(cropState: AvatarEditorCropState | null): void {
    this.savedCropState.set(cropState);
    this.liveCropState.set(cropState);
  }

  private syncClerkImageUrl(): void {
    const user = this.clerk.user();
    this.lastClerkImageUrl.set(user?.hasImage ? user.imageUrl : undefined);
  }

  private async loadSessions(): Promise<void> {
    this.sessionsLoading.set(true);
    try {
      await this.refreshSessions();
    } finally {
      this.sessionsLoading.set(false);
    }
  }

  private async refreshSessions(): Promise<void> {
    try {
      const records = await this.api.get<UserSessionRecord[]>('/users/me/sessions');
      // Current session first, the rest by recency
      const sorted = [...records].sort((a, b) => {
        if (a.isCurrent) {
          return -1;
        }
        if (b.isCurrent) {
          return 1;
        }
        return b.lastActiveAt - a.lastActiveAt;
      });
      this.sessions.set(
        sorted.map(record => ({
          id: record.id,
          isCurrent: record.isCurrent,
          isMobile: record.isMobile,
          device: `${record.browserName ?? 'Unknown browser'} · ${record.deviceType ?? (record.isMobile ? 'Mobile' : 'Desktop')}`,
          lastActive: new Date(record.lastActiveAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        })),
      );
    } catch {
      // non-critical
    }
  }

  private revokeOtherSessions(): Promise<void> {
    return this.api.post<void>('/users/me/sessions/revoke-others', {});
  }

  private showClerkErrorToast(title: string, e: unknown): void {
    this.toast.show(asSentence(this.clerk.extractError(e)), { title, variant: 'error' });
  }
}
