import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GamesEffects } from './games.effects';
import { GamesState, gamesReducer } from './games.reducer';

@NgModule({
  imports: [
    CommonModule,
    EffectsModule.forFeature([GamesEffects]),
    StoreModule.forFeature<GamesState>('gamesState', gamesReducer),
  ],
})
export class GamesStoreModule {}
