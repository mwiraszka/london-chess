import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { NgModule } from '@angular/core';

import { ArticlesEffects } from './articles.effects';
import { ArticlesState, articlesReducer } from './articles.reducer';

@NgModule({
  imports: [
    EffectsModule.forFeature([ArticlesEffects]),
    StoreModule.forFeature<ArticlesState>('articlesState', articlesReducer),
  ],
})
export class ArticlesStoreModule {}
