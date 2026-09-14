import { ButtonComponent, MailIconComponent, ToastService } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NewPasswordFieldsComponent } from '@app/components/new-password-fields/new-password-fields.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { AuthDrawerService, ClerkService, MetaAndTitleService } from '@app/services';
import { createNewPasswordGroup } from '@app/utils';

@Component({
  selector: 'lcc-accept-invitation-page',
  templateUrl: './accept-invitation-page.component.html',
  styleUrls: [
    '../../components/auth-drawer/auth-form.component.scss',
    './accept-invitation-page.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    NewPasswordFieldsComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
  ],
})
export class AcceptInvitationPageComponent implements OnInit {
  private readonly authDrawer = inject(AuthDrawerService);
  private readonly clerkService = inject(ClerkService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // Clerk appends the ticket and its status to the redirect URL set on the invitation
  private readonly queryParams = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly ticket = this.queryParams.get('__clerk_ticket');
  protected readonly firstName = this.queryParams.get('firstName');
  private readonly lastName = this.queryParams.get('lastName');

  protected readonly alreadyHasAccount =
    this.queryParams.get('__clerk_status') === 'sign_in';
  protected readonly isLinkIncomplete = !this.ticket || !this.firstName || !this.lastName;
  protected readonly pageIcon = MailIconComponent;

  protected readonly form = new FormGroup({ passwords: createNewPasswordGroup() });

  protected readonly error = signal('');
  protected readonly loading = signal(false);

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Accept Invitation');
    this.metaAndTitleService.updateDescription(
      'Finish creating your London Chess account.',
    );
  }

  protected onLogIn(): void {
    this.authDrawer.openLogin();
  }

  protected async onSubmit(): Promise<void> {
    if (!this.ticket || !this.firstName || !this.lastName || this.form.invalid) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    try {
      await this.clerkService.acceptInvitation(
        this.ticket,
        this.form.controls.passwords.controls.newPassword.value,
        this.firstName,
        this.lastName,
      );
      this.toast.show(`Welcome to London Chess, ${this.firstName}.`, {
        title: 'Account created',
        variant: 'success',
      });
      await this.router.navigate(['/account/profile']);
    } catch (e: unknown) {
      this.error.set(this.clerkService.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }
}
