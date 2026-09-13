import { Router } from 'express';

import {
  changePassword,
  deleteMe,
  deleteUserAvatar,
  getMe,
  getUserAvatar,
  getUserAvatars,
  requestAccount,
  updateCroppedAvatar,
  updateMe,
  uploadUserAvatar,
} from '../controllers/users.controller';
import { auth } from '../middlewares/auth.index';
import { avatarUpload } from '../middlewares/avatar-upload.middleware';

export const usersRouter = Router()
  .post('/account-requests', requestAccount)
  .get('/avatars', getUserAvatars)
  .get('/me', auth, getMe)
  .patch('/me', auth, updateMe)
  .post('/me/password', auth, changePassword)
  .post('/me/avatar', auth, avatarUpload, uploadUserAvatar)
  .patch('/me/avatar', auth, avatarUpload, updateCroppedAvatar)
  .delete('/me/avatar', auth, deleteUserAvatar)
  .delete('/me', auth, deleteMe)
  .get('/:id/avatar', getUserAvatar);
