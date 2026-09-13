import { Router } from 'express';

import {
  addMember,
  deleteMember,
  getMember,
  getMembers,
  updateMember,
  updateMembers,
} from '../controllers/members.controller';
import { adminAuth } from '../middlewares/auth.index';

export const publicMembersRouter = Router()
  .get('/', getMembers('public'))
  .get('/:id', getMember('public'));

export const adminMembersRouter = Router()
  .get('/', adminAuth, getMembers('admin'))
  .get('/:id', adminAuth, getMember('admin'))
  .post('/', adminAuth, addMember)
  .put('/', adminAuth, updateMembers)
  .put('/:id', adminAuth, updateMember)
  .delete('/:id', adminAuth, deleteMember);
