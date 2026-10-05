import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { AuthEffects } from './auth.effects';
import { AuthState, authReducer } from './auth.reducer';

@NgModule({
  imports: [
    EffectsModule.forFeature([AuthEffects]),
    StoreModule.forFeature<AuthState>('authState', authReducer),
  ],
})
export class AuthStoreModule {}
