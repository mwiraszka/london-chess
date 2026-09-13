import {
  AlertTriangleIconComponent,
  AvatarEditorComponent,
  type AvatarEditorCropState,
  ButtonComponent,
  CardComponent,
  CheckIconComponent,
  DialogComponent,
  InputComponent,
  MonitorIconComponent,
  SettingsIconComponent,
  ShieldIconComponent,
  SkeletonComponent,
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { ApiError, ApiService, MetaAndTitleService } from '@app/services';
import { ClerkService, type SessionInfo } from '@app/services/clerk.service';
import { type UserRecord, UserService } from '@app/services/user.service';
import { isValidEmail } from '@app/utils/email.util';
import { asSentence } from '@app/utils/sentence.util';

const ACCOUNT_SECTIONS = ['profile', 'security', 'danger'] as const;
type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

function isAccountSection(value: string | null): value is AccountSection {
  return ACCOUNT_SECTIONS.some(section => section === value);
}

@Component({
  selector: 'lcc-account-page',
  templateUrl: './account-page.component.html',
  styleUrl: './account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    AlertTriangleIconComponent,
    AvatarEditorComponent,
    ButtonComponent,
    CardComponent,
    CheckIconComponent,
    DialogComponent,
    InputComponent,
    MonitorIconComponent,
    RouterLink,
    ShieldIconComponent,
    SkeletonComponent,
    UserIconComponent,
    PageHeaderComponent,
  ],
})
export class AccountPageComponent implements OnInit {
  protected readonly pageIcon = SettingsIconComponent;

  private readonly api = inject(ApiService);
  private readonly clerk = inject(ClerkService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly toast = inject(ToastService);

  protected readonly navItems = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'security' as const, label: 'Security' },
    { id: 'danger' as const, label: 'Danger zone' },
  ];

  private readonly sectionParam = toSignal(
    this.route.paramMap.pipe(map(params => params.get('section'))),
    { initialValue: this.route.snapshot.paramMap.get('section') },
  );
  protected readonly activeSection = computed<AccountSection>(() => {
    const section = this.sectionParam();
    return isAccountSection(section) ? section : 'profile';
  });

  private sessionsRequested = false;

  constructor() {
    // A section nobody recognises would otherwise sit on the profile pane while
    // the address bar still claims something else.
    effect(() => {
      if (!isAccountSection(this.sectionParam())) {
        void this.router.navigate(['/account/profile'], { replaceUrl: true });
      }
    });

    effect(() => {
      if (this.activeSection() === 'security' && !this.sessionsRequested) {
        this.sessionsRequested = true;
        void this.loadSessions();
      }
    });

    // The editor's revert control restores the baseline image without emitting,
    // so the pending-photo state has to be dropped here or Save would still
    // offer to upload the abandoned file
    effect(() => {
      if (this.avatarEditor()?.isAtOriginal()) {
        this.originalFile = null;
        this.avatarDirty.set(false);
        this.removeAvatar.set(false);
        this.liveCropState.set(this.savedCropState());
      }
    });
  }

  readonly newEmail = signal('');
  readonly emailError = signal('');
  readonly emailStep = signal<'idle' | 'verify'>('idle');
  readonly emailCode = signal('');
  readonly emailCodeError = signal('');
  readonly emailBusy = signal(false);
  private pendingEmailId: string | null = null;

  protected readonly emailInputError = computed(() => {
    const email = this.newEmail().trim();
    if (!email || email === this.email()) {
      return '';
    }
    return isValidEmail(email) ? '' : 'Please enter a valid email address';
  });
  protected readonly canSubmitEmail = computed(() => {
    const email = this.newEmail().trim();
    return email.length > 0 && email !== this.email() && isValidEmail(email);
  });

  readonly currentPassword = signal('');
  readonly currentPasswordError = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly passwordBusy = signal(false);

  protected readonly hasPassword = computed(() => !!this.clerk.user()?.passwordEnabled);

  protected readonly passwordChecks = computed(() => {
    const password = this.newPassword();
    return {
      length: password.length >= 8,
      cases: /[a-z]/.test(password) && /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  });
  protected readonly isPasswordStrong = computed(() => {
    const checks = this.passwordChecks();
    return checks.length && checks.cases && checks.number && checks.special;
  });
  protected readonly confirmMismatch = computed(
    () =>
      this.confirmPassword().length > 0 && this.confirmPassword() !== this.newPassword(),
  );
  protected readonly canChangePassword = computed(
    () =>
      this.isPasswordStrong() &&
      this.newPassword() === this.confirmPassword() &&
      (!this.hasPassword() || this.currentPassword().length > 0),
  );

  readonly sessions = signal<SessionInfo[]>([]);
  readonly sessionsLoading = signal(false);
  readonly revokingOthers = signal(false);

  private readonly avatarEditor = viewChild(AvatarEditorComponent);

  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  private readonly originalFirstName = signal('');
  private readonly originalLastName = signal('');
  readonly firstNameError = signal('');
  readonly lastNameError = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly deleteDialogOpen = signal(false);
  readonly avatarDirty = signal(false);
  readonly avatarLoading = signal(false);

  readonly editorSrc = signal<string | undefined>(undefined);
  private readonly lastClerkImageUrl = signal<string | undefined>(undefined);
  readonly removeAvatar = signal(false);
  readonly savedCropState = signal<AvatarEditorCropState | null>(null);
  readonly liveCropState = signal<AvatarEditorCropState | null>(null);
  originalFile: File | null = null;

  readonly hasChanges = computed(() => {
    const nameChanged =
      this.firstName() !== this.originalFirstName() ||
      this.lastName() !== this.originalLastName();
    const photoChanged =
      this.avatarDirty() && !this.removeAvatar() && !!this.originalFile;
    const photoRemoved =
      this.avatarDirty() && this.removeAvatar() && this.userService.hasAvatar();
    return nameChanged || photoChanged || photoRemoved || this.isCropChanged();
  });

  ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Account');
    this.metaAndTitleService.updateDescription(
      'Manage your London Chess Club account, profile, and security settings.',
    );

    const user = this.clerk.user();
    this.firstName.set(user?.firstName ?? '');
    this.lastName.set(user?.lastName ?? '');
    this.email.set(user?.primaryEmailAddress?.emailAddress ?? '');
    this.newEmail.set(user?.primaryEmailAddress?.emailAddress ?? '');
    this.originalFirstName.set(user?.firstName ?? '');
    this.originalLastName.set(user?.lastName ?? '');

    const cropState = this.userService.avatarCropState();
    this.savedCropState.set(cropState);
    this.liveCropState.set(cropState);

    this.editorSrc.set(this.userService.avatarUrl());

    this.lastClerkImageUrl.set(user?.hasImage ? user.imageUrl : undefined);
    this.avatarLoading.set(!this.editorSrc() && !!user?.hasImage);

    this.refreshFromClerk().then(() => {
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

  private async refreshFromClerk(): Promise<void> {
    const previousClerkImageUrl = this.lastClerkImageUrl();

    await this.clerk.reloadUser();
    await this.userService.load();

    const user = this.userService.user();
    if (user) {
      if (user.firstName !== this.originalFirstName()) {
        this.firstName.set(user.firstName);
        this.originalFirstName.set(user.firstName);
      }
      if (user.lastName !== this.originalLastName()) {
        this.lastName.set(user.lastName);
        this.originalLastName.set(user.lastName);
      }
    }

    const clerkUser = this.clerk.user();
    this.email.set(clerkUser?.primaryEmailAddress?.emailAddress ?? '');
    const newClerkImageUrl = clerkUser?.hasImage ? clerkUser.imageUrl : undefined;

    if (newClerkImageUrl !== previousClerkImageUrl) {
      this.lastClerkImageUrl.set(newClerkImageUrl);
      this.editorSrc.set(this.userService.avatarUrl());

      const cropState = this.userService.avatarCropState();
      this.savedCropState.set(cropState);
      this.liveCropState.set(cropState);
    } else if (!this.avatarDirty() && this.editorSrc() !== this.userService.avatarUrl()) {
      // Before the account record loads, the editor may have been seeded with
      // the Clerk fallback (the small circular crop); once the record is in,
      // upgrade to the stored full-size original so re-cropping can reclaim
      // the whole photo
      this.editorSrc.set(this.userService.avatarUrl());

      const cropState = this.userService.avatarCropState();
      this.savedCropState.set(cropState);
      this.liveCropState.set(cropState);
    }
  }

  onAvatarRejected(message: string): void {
    this.toast.show(asSentence(message), { title: 'Invalid image', variant: 'error' });
  }

  onFileSelected(file: File): void {
    this.originalFile = file;
    this.avatarDirty.set(true);
    this.removeAvatar.set(false);
    this.liveCropState.set(null);
  }

  onCropStateChange(state: AvatarEditorCropState): void {
    this.liveCropState.set(state);
  }

  onRemoveAvatar(): void {
    this.avatarDirty.set(true);
    this.removeAvatar.set(true);
    this.originalFile = null;
  }

  async onSave(): Promise<void> {
    if (!this.validate()) {
      return;
    }

    this.saving.set(true);

    try {
      const changes = await this.applyChanges();

      if (changes.length) {
        this.toast.show(`Successfully updated your ${this.buildChangeList(changes)}.`, {
          title: 'Profile updated',
          variant: 'success',
        });
      }

      this.originalFirstName.set(this.firstName());
      this.originalLastName.set(this.lastName());
      this.avatarDirty.set(false);
      this.removeAvatar.set(false);
      this.originalFile = null;
      this.avatarEditor()?.captureOriginal();
    } catch (e: unknown) {
      this.toast.show(asSentence(this.clerk.extractError(e)), {
        title: 'Profile update failed',
        variant: 'error',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private validate(): boolean {
    this.firstNameError.set('');
    this.lastNameError.set('');

    const firstEmpty = !this.firstName().trim();
    if (firstEmpty) {
      this.firstNameError.set('First name is required');
    }

    const lastEmpty = !this.lastName().trim();
    if (lastEmpty) {
      this.lastNameError.set('Last name is required');
    }

    return !firstEmpty && !lastEmpty;
  }

  private async applyChanges(): Promise<string[]> {
    const changes: string[] = [];

    const firstChanged = this.firstName() !== this.originalFirstName();
    const lastChanged = this.lastName() !== this.originalLastName();
    const photoChanged =
      this.avatarDirty() && !this.removeAvatar() && !!this.originalFile;
    const photoRemoved =
      this.avatarDirty() && this.removeAvatar() && this.userService.hasAvatar();
    const cropChanged = this.isCropChanged();

    if (firstChanged || lastChanged) {
      await this.clerk.updateProfile(this.firstName(), this.lastName());
      await this.saveNameToBackend(firstChanged, lastChanged);
      if (firstChanged) {
        changes.push('first name');
      }
      if (lastChanged) {
        changes.push('last name');
      }
    }

    if (photoChanged) {
      await this.savePhoto();
      changes.push('photo');
    } else if (photoRemoved) {
      await this.removePhoto();
      changes.push('photo');
    } else if (cropChanged) {
      await this.saveCropState();
      changes.push('photo');
    }

    return changes;
  }

  private async saveNameToBackend(
    firstChanged: boolean,
    lastChanged: boolean,
  ): Promise<void> {
    const body: { firstName?: string; lastName?: string } = {};
    if (firstChanged) {
      body.firstName = this.firstName();
    }
    if (lastChanged) {
      body.lastName = this.lastName();
    }
    await this.api.patch('/users/me', body);
  }

  private async savePhoto(): Promise<void> {
    const blob = await this.exportCrop();
    const cropState = this.liveCropState();

    if (this.originalFile) {
      await this.uploadOriginalAvatar(this.originalFile, blob, cropState);
      await this.clerk.reloadUser();
      const user = this.clerk.user();
      this.lastClerkImageUrl.set(user?.hasImage ? user.imageUrl : undefined);
    }
  }

  private async removePhoto(): Promise<void> {
    await this.deleteOriginalAvatar();
    await this.clerk.reloadUser();
    const user = this.clerk.user();
    this.lastClerkImageUrl.set(user?.hasImage ? user.imageUrl : undefined);
  }

  private async saveCropState(): Promise<void> {
    const cropState = this.liveCropState();
    if (!cropState) {
      return;
    }
    const blob = await this.exportCrop();
    const formData = new FormData();
    formData.append('cropped', blob, 'cropped.png');
    formData.append('cropState', JSON.stringify(cropState));
    const user = await this.api.patch<UserRecord>('/users/me/avatar', formData);
    this.userService.setUser(user);
    this.lastClerkImageUrl.set(user.clerkImageUrl ?? undefined);
    this.savedCropState.set(cropState);
    await this.clerk.reloadUser();
  }

  private buildChangeList(changes: string[]): string {
    return changes.length <= 2
      ? changes.join(' and ')
      : `${changes.slice(0, -1).join(', ')} and ${changes.at(-1)}`;
  }

  private isCropChanged(): boolean {
    if (this.avatarDirty()) {
      return false;
    }
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
  }

  private async uploadOriginalAvatar(
    file: File,
    cropped: Blob,
    cropState: AvatarEditorCropState | null,
  ): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cropped', cropped, 'cropped.png');
    if (cropState) {
      formData.append('cropState', JSON.stringify(cropState));
    }
    const user = await this.api.post<UserRecord>('/users/me/avatar', formData);
    this.userService.setUser(user);
    this.lastClerkImageUrl.set(user.clerkImageUrl ?? undefined);
    this.savedCropState.set(cropState);
    this.liveCropState.set(cropState);
  }

  private async deleteOriginalAvatar(): Promise<void> {
    await this.api.delete('/users/me/avatar');
    this.userService.clearAvatar();
    this.editorSrc.set(undefined);
    this.savedCropState.set(null);
    this.liveCropState.set(null);
  }

  async onConfirmDelete(): Promise<void> {
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
      this.toast.show(asSentence(this.clerk.extractError(e)), {
        title: 'Deletion failed',
        variant: 'error',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  exportCrop(): Promise<Blob> {
    return this.avatarEditor()!.exportCrop();
  }

  async onChangeEmail(): Promise<void> {
    const email = this.newEmail().trim();
    this.emailError.set('');
    if (!isValidEmail(email)) {
      this.emailError.set('Please enter a valid email address');
      return;
    }
    if (email === this.email()) {
      this.emailError.set('Enter a different email address');
      return;
    }
    this.emailBusy.set(true);
    try {
      this.pendingEmailId = await this.clerk.createEmail(email);
      this.emailStep.set('verify');
    } catch (e: unknown) {
      this.emailError.set(this.clerk.extractError(e));
    } finally {
      this.emailBusy.set(false);
    }
  }

  async onVerifyEmail(): Promise<void> {
    if (!this.pendingEmailId) {
      return;
    }
    this.emailCodeError.set('');
    this.emailBusy.set(true);
    try {
      await this.clerk.verifyAndSetPrimaryEmail(
        this.pendingEmailId,
        this.emailCode().trim(),
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

  cancelEmailChange(): void {
    this.resetEmailChange();
  }

  private resetEmailChange(): void {
    this.pendingEmailId = null;
    this.emailStep.set('idle');
    this.newEmail.set(this.email());
    this.emailCode.set('');
    this.emailError.set('');
    this.emailCodeError.set('');
  }

  async onChangePassword(): Promise<void> {
    if (!this.canChangePassword()) {
      return;
    }
    this.currentPasswordError.set('');
    this.passwordBusy.set(true);
    try {
      await this.api.post('/users/me/password', {
        currentPassword: this.hasPassword() ? this.currentPassword() : undefined,
        newPassword: this.newPassword(),
      });

      try {
        await this.clerk.revokeOtherSessions();
      } catch {
        // non-critical; the password itself changed
      }

      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
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

  async loadSessions(): Promise<void> {
    this.sessionsLoading.set(true);
    try {
      this.sessions.set(await this.clerk.listSessions());
    } catch {
      // non-critical
    } finally {
      this.sessionsLoading.set(false);
    }
  }

  async onRevokeOtherSessions(): Promise<void> {
    this.revokingOthers.set(true);
    try {
      await this.clerk.revokeOtherSessions();
      await this.loadSessions();
      this.toast.show('Successfully logged out of all your other devices.', {
        title: 'Logout',
        variant: 'success',
      });
    } catch (e: unknown) {
      this.toast.show(asSentence(this.clerk.extractError(e)), {
        title: 'Logout failed',
        variant: 'error',
      });
    } finally {
      this.revokingOthers.set(false);
    }
  }
}
