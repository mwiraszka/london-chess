import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { EventsEffects } from './events.effects';
import { EventsState, eventsReducer } from './events.reducer';

@NgModule({
  imports: [
    EffectsModule.forFeature([EventsEffects]),
    StoreModule.forFeature<EventsState>('eventsState', eventsReducer),
  ],
})
export class EventsStoreModule {}
