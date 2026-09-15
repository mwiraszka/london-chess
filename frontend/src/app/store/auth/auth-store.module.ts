import { StoreModule } from '@ngrx/store';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AuthState, authReducer } from './auth.reducer';

@NgModule({
  imports: [CommonModule, StoreModule.forFeature<AuthState>('authState', authReducer)],
})
export class AuthStoreModule {}
