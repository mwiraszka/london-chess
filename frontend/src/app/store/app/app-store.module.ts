import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { AppEffects } from './app.effects';
import { AppState, appReducer } from './app.reducer';

@NgModule({
  imports: [
    StoreModule.forFeature<AppState>('appState', appReducer),
    EffectsModule.forFeature([AppEffects]),
  ],
})
export class AppStoreModule {}
