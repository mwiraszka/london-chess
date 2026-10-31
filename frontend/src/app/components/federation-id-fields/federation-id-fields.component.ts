import { InputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';

@Component({
  selector: 'lcc-federation-id-fields',
  templateUrl: './federation-id-fields.component.html',
  host: { class: 'lcc-form-row' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputComponent, ReactiveFormsModule],
})
export class FederationIdFieldsComponent {
  readonly cfcId = input.required<FormControl<string>>();
  readonly fideId = input.required<FormControl<string>>();

  protected readonly cfcIdErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.cfcId.message,
  };
  protected readonly fideIdErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.fideId.message,
  };
}
