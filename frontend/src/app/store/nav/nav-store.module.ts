import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NavEffects } from './nav.effects';
import { NavState, navReducer } from './nav.reducer';

@NgModule({
  imports: [
    CommonModule,
    EffectsModule.forFeature([NavEffects]),
    StoreModule.forFeature<NavState>('navState', navReducer),
  ],
})
export class NavStoreModule {}
