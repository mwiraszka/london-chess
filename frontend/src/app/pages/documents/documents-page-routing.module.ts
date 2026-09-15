import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DocumentsPageComponent } from './documents-page.component';

const routes: Routes = [
  {
    path: '',
    component: DocumentsPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentsPageRoutingModule {}
