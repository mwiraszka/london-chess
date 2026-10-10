import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { TournamentsEffects } from './tournaments.effects';
import { TournamentsState, tournamentsReducer } from './tournaments.reducer';

@NgModule({
  imports: [
    EffectsModule.forFeature([TournamentsEffects]),
    StoreModule.forFeature<TournamentsState>('tournamentsState', tournamentsReducer),
  ],
})
export class TournamentsStoreModule {}
