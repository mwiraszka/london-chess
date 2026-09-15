import { InputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { FieldLabelWithHelpComponent } from '@app/components/field-label-with-help/field-label-with-help.component';
import { ChesscomLogoComponent } from '@app/components/platform-logos/chesscom-logo.component';
import { LichessLogoComponent } from '@app/components/platform-logos/lichess-logo.component';
import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';

@Component({
  selector: 'lcc-chess-username-fields',
  templateUrl: './chess-username-fields.component.html',
  styleUrl: './chess-username-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldLabelWithHelpComponent, InputComponent, ReactiveFormsModule],
})
export class ChessUsernameFieldsComponent {
  readonly chessComUsername = input.required<FormControl<string>>();
  readonly lichessUsername = input.required<FormControl<string>>();

  protected readonly chessComErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.chessComUsername.message,
  };
  protected readonly chessComLogo = ChesscomLogoComponent;
  protected readonly lichessErrorMessages = {
    pattern: MEMBER_DETAIL_RULES.lichessUsername.message,
  };
  protected readonly lichessLogo = LichessLogoComponent;
}
