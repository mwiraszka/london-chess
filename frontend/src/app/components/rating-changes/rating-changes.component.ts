import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { BasicDialogResult, DialogOutput, MemberWithNewRatings } from '@app/models';

@Component({
  selector: 'lcc-rating-changes',
  templateUrl: './rating-changes.component.html',
  styleUrl: './rating-changes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingChangesComponent implements DialogOutput<BasicDialogResult> {
  @Input() membersWithNewRatings?: MemberWithNewRatings[];
  @Input() unmatchedMembers?: string[];

  @Output() dialogResult = new EventEmitter<BasicDialogResult | 'close'>();
}
