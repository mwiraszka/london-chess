import { Router } from 'express';

import {
  changePassword,
  deleteMe,
  deleteUserAvatar,
  getMe,
  getMyMember,
  getUserAvatar,
  listMySessions,
  requestAccount,
  requestAccountVerification,
  requestMemberDetailsChange,
  revokeOtherSessions,
  updateCroppedAvatar,
  updateMe,
  uploadUserAvatar,
} from '../controllers/users.controller';
import { auth } from '../middlewares/auth.index';
import { avatarUpload } from '../middlewares/avatar-upload.middleware';

export const usersRouter = Router()
  .post('/account-requests', requestAccount)
  .post('/account-requests/verification', requestAccountVerification)
  .get('/me', auth, getMe)
  .get('/me/member', auth, getMyMember)
  .post('/me/member/change-request', auth, requestMemberDetailsChange)
  .get('/me/sessions', auth, listMySessions)
  .post('/me/sessions/revoke-others', auth, revokeOtherSessions)
  .patch('/me', auth, updateMe)
  .post('/me/password', auth, changePassword)
  .post('/me/avatar', auth, avatarUpload, uploadUserAvatar)
  .patch('/me/avatar', auth, avatarUpload, updateCroppedAvatar)
  .delete('/me/avatar', auth, deleteUserAvatar)
  .delete('/me', auth, deleteMe)
  .get('/:id/avatar', getUserAvatar);
