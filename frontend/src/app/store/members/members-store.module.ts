import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { MembersEffects } from './members.effects';
import { MembersState, membersReducer } from './members.reducer';

@NgModule({
  imports: [
    EffectsModule.forFeature([MembersEffects]),
    StoreModule.forFeature<MembersState>('membersState', membersReducer),
  ],
})
export class MembersStoreModule {}
