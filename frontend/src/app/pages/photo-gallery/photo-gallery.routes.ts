import { Routes } from '@angular/router';

import { PhotoGalleryPageComponent } from './photo-gallery-page.component';

export const PHOTO_GALLERY_ROUTES: Routes = [
  {
    path: '',
    component: PhotoGalleryPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
