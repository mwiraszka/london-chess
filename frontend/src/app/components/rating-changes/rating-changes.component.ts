import { DataTableColumn } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { DialogButtonsComponent } from '@app/components/dialog-buttons/dialog-buttons.component';
import { BasicDialogResult, DialogOutput, MemberWithNewRatings } from '@app/models';

export interface RatingChangeRow {
  id: string;
  firstName: string;
  lastName: string;
  rating: string;
  newRating: string;
  peakRating: string;
  newPeakRating: string;
}

type CellTemplate = TemplateRef<{ $implicit: RatingChangeRow; value: unknown }>;

@Component({
  selector: 'lcc-rating-changes',
  templateUrl: './rating-changes.component.html',
  styleUrl: './rating-changes.component.scss',
  imports: [DataTableComponent, DialogButtonsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingChangesComponent implements DialogOutput<BasicDialogResult> {
  public readonly confirmAction = input<() => Promise<unknown>>();
  public readonly membersWithNewRatings = input<MemberWithNewRatings[]>();
  public readonly unmatchedMembers = input<string[]>();

  readonly dialogResult = output<BasicDialogResult | 'close'>();

  private readonly newRatingCell = viewChild.required<CellTemplate>('newRatingCell');
  private readonly newPeakRatingCell =
    viewChild.required<CellTemplate>('newPeakRatingCell');

  protected readonly rows = computed<RatingChangeRow[]>(() =>
    (this.membersWithNewRatings() ?? []).map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      rating: member.rating,
      newRating: member.newRating,
      peakRating: member.peakRating,
      newPeakRating: member.newPeakRating,
    })),
  );

  protected readonly columns = computed<DataTableColumn<RatingChangeRow>[]>(() => [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'rating', label: 'Old rating', align: 'right' },
    {
      key: 'newRating',
      label: 'New rating',
      align: 'right',
      cellTemplate: this.newRatingCell(),
    },
    { key: 'peakRating', label: 'Old peak rating', align: 'right' },
    {
      key: 'newPeakRating',
      label: 'New peak rating',
      align: 'right',
      cellTemplate: this.newPeakRatingCell(),
    },
  ]);
}
