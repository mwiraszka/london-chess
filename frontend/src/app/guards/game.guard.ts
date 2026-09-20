import { CanActivateFn } from '@angular/router';

import { Game } from '@app/models';
import { GamesActions, GamesSelectors } from '@app/store/games';
import { isCollectionId } from '@app/utils';

import { recordGuard } from './record.guard';

export function gameGuard(param: string): CanActivateFn {
  return recordGuard<Game>({
    param,
    isWellFormed: isCollectionId,
    select: GamesSelectors.selectGameById,
    request: gameId => GamesActions.fetchGameRequested({ gameId }),
    failed: GamesActions.fetchGameFailed,
    refreshes: false,
  });
}
