import { Router } from 'express';

import {
  addArticleReaction,
  getArticleReactions,
  removeArticleReaction,
} from '../controllers/article-reactions.controller';
import {
  addArticle,
  deleteArticle,
  getArticle,
  getArticles,
  updateArticle,
} from '../controllers/articles.controller';
import { adminAuth, authenticate } from '../middlewares/auth.middleware';

export const articlesRouter = Router()
  .get('/', getArticles)
  .get('/:id', getArticle)
  .get('/:id/reactions', getArticleReactions)
  .put('/:id/reactions/:emoji', authenticate, addArticleReaction)
  .delete('/:id/reactions/:emoji', authenticate, removeArticleReaction)
  .post('/', adminAuth, addArticle)
  .put('/:id', adminAuth, updateArticle)
  .delete('/:id', adminAuth, deleteArticle);
