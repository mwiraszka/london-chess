import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { TournamentsEffects } from './tournaments.effects';
import { TournamentsState, tournamentsReducer } from './tournaments.reducer';

@NgModule({
  imports: [
    CommonModule,
    EffectsModule.forFeature([TournamentsEffects]),
    StoreModule.forFeature<TournamentsState>('tournamentsState', tournamentsReducer),
  ],
})
export class TournamentsStoreModule {}
