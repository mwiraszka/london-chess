import { Router } from 'express';

import {
  changePassword,
  confirmMyPassword,
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
import { authenticate } from '../middlewares/auth.middleware';
import { avatarUpload } from '../middlewares/avatar-upload.middleware';

export const usersRouter = Router()
  .post('/account-requests', requestAccount)
  .post('/account-requests/verification', requestAccountVerification)
  .get('/me', authenticate, getMe)
  .get('/me/member', authenticate, getMyMember)
  .post('/me/member/change-request', authenticate, requestMemberDetailsChange)
  .get('/me/sessions', authenticate, listMySessions)
  .post('/me/sessions/revoke-others', authenticate, revokeOtherSessions)
  .patch('/me', authenticate, updateMe)
  .post('/me/password', authenticate, changePassword)
  .post('/me/password/confirm', authenticate, confirmMyPassword)
  .post('/me/avatar', authenticate, avatarUpload, uploadUserAvatar)
  .patch('/me/avatar', authenticate, avatarUpload, updateCroppedAvatar)
  .delete('/me/avatar', authenticate, deleteUserAvatar)
  .delete('/me', authenticate, deleteMe)
  .get('/:id/avatar', getUserAvatar);
