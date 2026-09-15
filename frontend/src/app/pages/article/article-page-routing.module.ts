import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { UnsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

import { ArticleEditorPageComponent } from './article-editor-page.component';
import { ArticleViewerPageComponent } from './article-viewer-page.component';

const routes: Routes = [
  {
    path: 'view/:article_id',
    component: ArticleViewerPageComponent,
    canActivate: [collectionIdGuard('article_id')],
  },
  {
    path: 'add',
    component: ArticleEditorPageComponent,
    canActivate: [AuthGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'edit/:article_id',
    component: ArticleEditorPageComponent,
    canActivate: [collectionIdGuard('article_id'), AuthGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: '**',
    redirectTo: '/',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArticlePageRoutingModule {}
