import { CanActivateFn } from '@angular/router';

import { Tournament } from '@app/models';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import { isRecordNumber } from '@app/utils';

import { recordGuard } from './record.guard';

export function tournamentGuard(param: string): CanActivateFn {
  return recordGuard<Tournament>({
    param,
    isWellFormed: isRecordNumber,
    select: value => TournamentsSelectors.selectTournamentByNumber(Number(value)),
    request: value =>
      TournamentsActions.fetchTournamentRequested({ tournamentNumber: Number(value) }),
    failed: TournamentsActions.fetchTournamentFailed,
    refreshes: false,
  });
}
