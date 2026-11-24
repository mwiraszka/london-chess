import {
  ButtonComponent,
  ClipboardCheckIconComponent,
  CopyIconComponent,
  DialogComponent,
  DialogRef,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { UnnotifiedMember } from '@app/models';

/**
 * Lists the members an email could not reach after a save, with their addresses, so an
 * admin can let them know another way.
 */
@Component({
  selector: 'lcc-unnotified-members-dialog',
  templateUrl: './unnotified-members-dialog.component.html',
  styleUrl: './unnotified-members-dialog.component.scss',
  imports: [ButtonComponent, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnnotifiedMembersDialogComponent {
  protected readonly dialogRef = inject(DialogRef);

  // What the email was about, such as "the new event Blitz"
  public readonly subject = input.required<string>();
  public readonly members = input.required<UnnotifiedMember[]>();

  protected readonly copied = signal<boolean | null>(null);
  protected readonly copyIcon = computed(() =>
    this.copied() ? ClipboardCheckIconComponent : CopyIconComponent,
  );
  protected readonly copyLabel = computed(() => {
    switch (this.copied()) {
      case true:
        return 'Addresses copied';
      case false:
        return 'Could not copy the addresses';
      default:
        return 'Copy email addresses';
    }
  });

  protected readonly intro = computed(() => {
    const count = this.members().length;
    const who = count === 1 ? 'this member' : `these ${count} members`;
    return `The email about ${this.subject()} could not be sent to ${who}. The save itself went through, so you may want to let them know another way.`;
  });

  public async onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        this.members()
          .map(({ email }) => email)
          .join(', '),
      );
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
