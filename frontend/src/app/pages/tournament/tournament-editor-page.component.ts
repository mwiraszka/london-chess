import { AwardIconComponent, ShieldCheckIconComponent } from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { FormSkeletonComponent } from '@app/components/form-skeleton/form-skeleton.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TournamentFormComponent } from '@app/components/tournament-form/tournament-form.component';
import {
  EditorPage,
  InternalLink,
  LoadStatus,
  Tournament,
  TournamentFormData,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import { isRecordNumber } from '@app/utils';

@Component({
  selector: 'lcc-tournament-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @switch (vm.status) {
        @case ('loaded') {
          <lcc-page-header
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [heading]="vm.pageHeading"
            [icon]="adminIcon">
          </lcc-page-header>

          <lcc-tournament-form
            [formData]="vm.formData"
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [originalTournament]="vm.originalTournament"
            (cancel)="onCancel(vm.tournamentNumber)"
            (change)="onChange($event.tournamentNumber, $event.formData)"
            (restore)="onRestore($event)" />
        }
        @case ('failed') {
          <lcc-load-failed
            title="Unable to load this tournament"
            (retry)="onRetry(vm.tournamentNumber)" />
        }
        @default {
          <lcc-form-skeleton />
        }
      }

      <lcc-link-list [links]="[tournamentsPageLink]" />
    }
  `,
  imports: [
    AsyncPipe,
    FormSkeletonComponent,
    LinkListComponent,
    LoadFailedComponent,
    PageHeaderComponent,
    TournamentFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentEditorPageComponent implements EditorPage, OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly adminIcon = ShieldCheckIconComponent;

  public readonly entity = 'tournament';
  public readonly tournamentsPageLink: InternalLink = {
    text: 'See all tournaments',
    internalPath: 'tournaments',
    icon: AwardIconComponent,
  };
  public viewModel$?: Observable<{
    tournamentNumber: number | null;
    formData: TournamentFormData;
    hasUnsavedChanges: boolean;
    originalTournament: Tournament | null;
    pageHeading: string;
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      map(params => {
        const value: unknown = params['number'];
        return isRecordNumber(value) ? Number(value) : null;
      }),
      switchMap(tournamentNumber =>
        combineLatest([
          of(tournamentNumber),
          tournamentNumber === null
            ? of(null)
            : this.store.select(
                TournamentsSelectors.selectTournamentByNumber(tournamentNumber),
              ),
          this.store.select(
            TournamentsSelectors.selectTournamentFormData(tournamentNumber),
          ),
          this.store.select(
            TournamentsSelectors.selectHasUnsavedChanges(tournamentNumber),
          ),
          tournamentNumber === null
            ? of<LoadStatus>('loaded')
            : this.store.select(
                TournamentsSelectors.selectTournamentStatus(tournamentNumber),
              ),
        ]),
      ),
      map(
        ([
          tournamentNumber,
          originalTournament,
          formData,
          hasUnsavedChanges,
          status,
        ]) => ({
          tournamentNumber,
          originalTournament,
          formData,
          hasUnsavedChanges,
          pageHeading: originalTournament
            ? `Edit ${originalTournament.name}`
            : 'Add a tournament',
          status,
        }),
      ),
      tap(viewModel => {
        this.metaAndTitleService.updateTitle(viewModel.pageHeading);
        this.metaAndTitleService.updateDescription(
          `${viewModel.pageHeading} for the London Chess Club.`,
        );
      }),
    );
  }

  public onCancel(tournamentNumber: number | null): void {
    this.store.dispatch(TournamentsActions.cancelSelected({ tournamentNumber }));
  }

  public onChange(
    tournamentNumber: number | null,
    formData: Partial<TournamentFormData>,
  ): void {
    this.store.dispatch(
      TournamentsActions.formDataChanged({ tournamentNumber, formData }),
    );
  }

  public onRetry(tournamentNumber: number | null): void {
    if (tournamentNumber !== null) {
      this.store.dispatch(
        TournamentsActions.fetchTournamentRequested({ tournamentNumber }),
      );
    }
  }

  public onRestore(tournamentNumber: number | null): void {
    this.store.dispatch(TournamentsActions.formDataRestored({ tournamentNumber }));
  }
}
