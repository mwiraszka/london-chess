import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { GamesEffects } from './games.effects';
import { GamesState, gamesReducer } from './games.reducer';

@NgModule({
  imports: [
    EffectsModule.forFeature([GamesEffects]),
    StoreModule.forFeature<GamesState>('gamesState', gamesReducer),
  ],
})
export class GamesStoreModule {}
