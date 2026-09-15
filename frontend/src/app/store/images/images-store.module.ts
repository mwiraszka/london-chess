import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ImagesEffects } from './images.effects';
import { ImagesState, imagesReducer } from './images.reducer';

@NgModule({
  imports: [
    CommonModule,
    EffectsModule.forFeature([ImagesEffects]),
    StoreModule.forFeature<ImagesState>('imagesState', imagesReducer),
  ],
})
export class ImagesStoreModule {}
