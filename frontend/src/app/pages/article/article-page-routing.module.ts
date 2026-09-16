import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { accessGuard } from '@app/guards/auth.guard';
import { collectionIdGuard } from '@app/guards/collection-id.guard';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';

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
    canActivate: [accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
  },
  {
    path: 'edit/:article_id',
    component: ArticleEditorPageComponent,
    canActivate: [collectionIdGuard('article_id'), accessGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { access: 'admin' },
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
