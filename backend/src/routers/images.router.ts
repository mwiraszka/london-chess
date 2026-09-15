import { Router } from 'express';

import {
  addImages,
  deleteAlbum,
  deleteImage,
  getAllImagesMetadata,
  getBatchThumbnailImages,
  getMainImage,
  getThumbnailImages,
  updateImages,
} from '../controllers/images.controller';
import { adminAuth } from '../middlewares/auth.index';
import { imageUpload } from '../middlewares/image-upload.middleware';

export const imagesRouter = Router()
  .get('/all-metadata', getAllImagesMetadata)
  .get('/thumbnails', getThumbnailImages)
  .get('/batch-thumbnails', getBatchThumbnailImages)
  .get('/:id', getMainImage)
  .put('/', adminAuth, imageUpload, updateImages)
  .post('/', adminAuth, imageUpload, addImages)
  .delete('/:id', adminAuth, deleteImage)
  .delete('/album/:album', adminAuth, deleteAlbum);
