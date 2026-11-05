import { Router } from 'express';

import {
  addMember,
  deleteMember,
  getAllOtherNames,
  getMemberById,
  getMemberByNumber,
  getMemberProfiles,
  getMembers,
  getOtherNames,
  getWidestMembers,
  updateMember,
  updateMembers,
  updateOtherNames,
} from '../controllers/members.controller';
import { adminAuth } from '../middlewares/auth.middleware';

export const publicMembersRouter = Router()
  .get('/', getMembers('public'))
  .get('/profiles', getMemberProfiles)
  .get('/widest', getWidestMembers('public'))
  .get('/:number', getMemberByNumber('public'));

export const adminMembersRouter = Router()
  .get('/', adminAuth, getMembers('admin'))
  .get('/widest', adminAuth, getWidestMembers('admin'))
  .get('/other-names', adminAuth, getAllOtherNames)
  .get('/number/:number', adminAuth, getMemberByNumber('admin'))
  .get('/:id/other-names', adminAuth, getOtherNames)
  .put('/:id/other-names', adminAuth, updateOtherNames)
  .get('/:id', adminAuth, getMemberById)
  .post('/', adminAuth, addMember)
  .put('/', adminAuth, updateMembers)
  .put('/:id', adminAuth, updateMember)
  .delete('/:id', adminAuth, deleteMember);
