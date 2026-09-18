import { SkeletonComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'lcc-form-skeleton',
  templateUrl: './form-skeleton.component.html',
  styleUrl: './form-skeleton.component.scss',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-busy': 'true' },
})
export class FormSkeletonComponent {
  readonly fieldCount = input(6);

  protected readonly fields = computed(() =>
    Array.from({ length: this.fieldCount() }, (_, index) => index),
  );
}
