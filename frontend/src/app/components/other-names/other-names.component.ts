import {
  AlertComponent,
  ButtonComponent,
  CardComponent,
  InputComponent,
  SkeletonComponent,
  TagComponent,
} from '@eagami/ui';
import { firstValueFrom } from 'rxjs';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { Id, LoadStatus } from '@app/models';
import { MembersApiService } from '@app/services';
import { parseError } from '@app/utils';
import { textValidator } from '@app/validators';

/**
 * The names the archive records a member under besides their own, such as a name they
 * used before, which standings, PGNs and rating updates then find the member by. Each
 * change is saved as it is made.
 */
@Component({
  selector: 'lcc-other-names',
  templateUrl: './other-names.component.html',
  styleUrl: './other-names.component.scss',
  imports: [
    AlertComponent,
    ButtonComponent,
    CardComponent,
    InputComponent,
    LoadFailedComponent,
    ReactiveFormsModule,
    SkeletonComponent,
    TagComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtherNamesComponent implements OnInit {
  public readonly memberId = input.required<Id>();

  private readonly membersApiService = inject(MembersApiService);

  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly status = signal<LoadStatus>('loading');
  protected readonly names = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected readonly newName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), textValidator],
  });

  public ngOnInit(): void {
    void this.load();
  }

  public async load(): Promise<void> {
    this.status.set('loading');
    try {
      const { data } = await firstValueFrom(
        this.membersApiService.getOtherNames(this.memberId()),
      );
      this.names.set(data);
      this.status.set('loaded');
    } catch {
      this.status.set('failed');
    }
  }

  public async onAdd(): Promise<void> {
    if (this.newName.invalid) {
      this.newName.markAsTouched();
      return;
    }
    if (await this.save([...this.names(), this.newName.value.trim()])) {
      this.newName.reset();
    }
  }

  public async onRemove(name: string): Promise<void> {
    await this.save(this.names().filter(other => other !== name));
  }

  private async save(names: string[]): Promise<boolean> {
    this.saving.set(true);
    this.problem.set(null);
    try {
      const { data } = await firstValueFrom(
        this.membersApiService.updateOtherNames(this.memberId(), names),
      );
      this.names.set(data);
      return true;
    } catch (error) {
      this.problem.set(parseError(error).message);
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
