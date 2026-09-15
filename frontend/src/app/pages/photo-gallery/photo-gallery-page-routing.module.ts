import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PhotoGalleryPageComponent } from './photo-gallery-page.component';

const routes: Routes = [
  {
    path: '',
    component: PhotoGalleryPageComponent,
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
export class PhotoGalleryPageRoutingModule {}
