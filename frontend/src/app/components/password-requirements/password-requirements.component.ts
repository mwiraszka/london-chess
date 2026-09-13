import { CheckIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { getPasswordChecks } from '@app/utils/password.util';

@Component({
  selector: 'lcc-password-requirements',
  template: `
    <ul class="requirements">
      @for (requirement of requirements(); track requirement.label) {
        <li
          class="requirement"
          [class.requirement--met]="requirement.met">
          <ea-icon-check
            class="requirement__icon"
            aria-hidden="true" />
          {{ requirement.label }}
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }

    .requirements {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .requirement {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .requirement__icon {
      flex-shrink: 0;
      opacity: 0.4;
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .requirement--met {
      color: var(--color-text-primary);
    }

    .requirement--met .requirement__icon {
      opacity: 1;
      color: var(--color-success-default);
    }
  `,
  imports: [CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRequirementsComponent {
  readonly password = input.required<string>();

  protected readonly requirements = computed(() => {
    const checks = getPasswordChecks(this.password());
    return [
      { label: 'At least 8 characters', met: checks.length },
      { label: 'Upper and lowercase letters', met: checks.cases },
      { label: 'At least one number', met: checks.number },
      { label: 'At least one special character', met: checks.special },
    ];
  });
}
