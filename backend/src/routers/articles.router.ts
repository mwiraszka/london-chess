import { Router } from 'express';

import {
  addArticle,
  deleteArticle,
  getArticle,
  getArticles,
  updateArticle,
} from '../controllers/articles.controller';
import { adminAuth } from '../middlewares/auth.index';

export const articlesRouter = Router()
  .get('/', getArticles)
  .get('/:id', getArticle)
  .post('/', adminAuth, addArticle)
  .put('/:id', adminAuth, updateArticle)
  .delete('/:id', adminAuth, deleteArticle);
