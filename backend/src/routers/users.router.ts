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
import { clearCacheAfterWrite } from '../middlewares/cdn-cache.middleware';

export const usersRouter = Router()
  .post('/account-requests', requestAccount)
  .post('/account-requests/verification', requestAccountVerification)
  .get('/me', authenticate, getMe)
  .get('/me/member', authenticate, getMyMember)
  .post(
    '/me/member/change-request',
    authenticate,
    clearCacheAfterWrite,
    requestMemberDetailsChange,
  )
  .get('/me/sessions', authenticate, listMySessions)
  .post('/me/sessions/revoke-others', authenticate, revokeOtherSessions)
  .patch('/me', authenticate, clearCacheAfterWrite, updateMe)
  .post('/me/password', authenticate, changePassword)
  .post('/me/password/confirm', authenticate, confirmMyPassword)
  .post('/me/avatar', authenticate, clearCacheAfterWrite, avatarUpload, uploadUserAvatar)
  .patch(
    '/me/avatar',
    authenticate,
    clearCacheAfterWrite,
    avatarUpload,
    updateCroppedAvatar,
  )
  .delete('/me/avatar', authenticate, clearCacheAfterWrite, deleteUserAvatar)
  .delete('/me', authenticate, clearCacheAfterWrite, deleteMe)
  .get('/:id/avatar', getUserAvatar);
