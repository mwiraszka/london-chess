import { Router } from 'express';

import {
  addMember,
  deleteMember,
  getMemberById,
  getMemberByNumber,
  getMemberProfiles,
  getMembers,
  getWidestMembers,
  updateMember,
  updateMembers,
} from '../controllers/members.controller';
import { adminAuth } from '../middlewares/auth.index';

export const publicMembersRouter = Router()
  .get('/', getMembers('public'))
  .get('/profiles', getMemberProfiles)
  .get('/widest', getWidestMembers('public'))
  .get('/:number', getMemberByNumber('public'));

export const adminMembersRouter = Router()
  .get('/', adminAuth, getMembers('admin'))
  .get('/widest', adminAuth, getWidestMembers('admin'))
  .get('/number/:number', adminAuth, getMemberByNumber('admin'))
  .get('/:id', adminAuth, getMemberById)
  .post('/', adminAuth, addMember)
  .put('/', adminAuth, updateMembers)
  .put('/:id', adminAuth, updateMember)
  .delete('/:id', adminAuth, deleteMember);
