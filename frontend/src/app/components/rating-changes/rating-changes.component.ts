import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { DialogButtonsComponent } from '@app/components/dialog-buttons/dialog-buttons.component';
import { BasicDialogResult, DialogOutput, MemberWithNewRatings } from '@app/models';

@Component({
  selector: 'lcc-rating-changes',
  templateUrl: './rating-changes.component.html',
  styleUrl: './rating-changes.component.scss',
  imports: [DialogButtonsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingChangesComponent implements DialogOutput<BasicDialogResult> {
  @Input() confirmAction?: () => Promise<unknown>;
  @Input() membersWithNewRatings?: MemberWithNewRatings[];
  @Input() unmatchedMembers?: string[];

  @Output() dialogResult = new EventEmitter<BasicDialogResult | 'close'>();
}
