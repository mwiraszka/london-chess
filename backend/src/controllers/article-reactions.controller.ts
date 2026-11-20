import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import {
  ArticleReactionModel,
  MAX_REACTIONS_PER_MEMBER,
  ReactionEmoji,
  ReactionGroup,
  isReactionEmoji,
} from '../models/article-reaction.model';
import { ArticleModel } from '../models/article.model';
import { Id } from '../models/core.model';
import { findReactionGroups } from '../services/article-reactions.service';
import { findLinkedMember } from '../services/member-accounts.service';
import { isCollectionId } from '../util/is-collection-id.util';

type ReactionParams = { id: Id; emoji: string };

interface OwnReaction {
  articleId: Id;
  memberId: Id;
  emoji: ReactionEmoji;
}

const ARTICLE_NOT_FOUND = 'Unable to find this article.';

async function articleExists(id: Id): Promise<boolean> {
  return isCollectionId(id) && !!(await ArticleModel.exists({ _id: id }));
}

export async function getArticleReactions(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<ReactionGroup[]>>,
): Promise<void> {
  try {
    const { id } = req.params;
    if (!(await articleExists(id))) {
      res.status(404).json({ message: ARTICLE_NOT_FOUND });
      return;
    }

    res.status(200).json({ data: await findReactionGroups(id) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function addArticleReaction(
  req: Request<ReactionParams>,
  res: Response<ApiResponse<ReactionGroup[]>>,
): Promise<void> {
  await changeOwnReaction(req, res, async reaction => {
    const others = {
      articleId: reaction.articleId,
      memberId: reaction.memberId,
      emoji: { $ne: reaction.emoji },
    };
    // At the limit, one of the member's other emojis makes way for the new one
    if ((await ArticleReactionModel.countDocuments(others)) >= MAX_REACTIONS_PER_MEMBER) {
      await ArticleReactionModel.deleteOne(others);
    }

    await ArticleReactionModel.updateOne(
      reaction,
      { $setOnInsert: { reactedAt: new Date().toISOString() } },
      { upsert: true },
    );
  });
}

export async function removeArticleReaction(
  req: Request<ReactionParams>,
  res: Response<ApiResponse<ReactionGroup[]>>,
): Promise<void> {
  await changeOwnReaction(req, res, async reaction => {
    await ArticleReactionModel.deleteOne(reaction);
  });
}

async function changeOwnReaction(
  req: Request<ReactionParams>,
  res: Response<ApiResponse<ReactionGroup[]>>,
  change: (reaction: OwnReaction) => Promise<void>,
): Promise<void> {
  try {
    const { id, emoji } = req.params;
    if (!isReactionEmoji(emoji)) {
      res.status(400).json({ message: 'Articles cannot be given this emoji.' });
      return;
    }
    if (!(await articleExists(id))) {
      res.status(404).json({ message: ARTICLE_NOT_FOUND });
      return;
    }

    const member = await findLinkedMember(req.user.id);
    if (typeof member?.number !== 'number') {
      res.status(403).json({ message: 'Only club members can react to articles.' });
      return;
    }

    await change({ articleId: id, memberId: member._id.toString(), emoji });
    res.status(200).json({ data: await findReactionGroups(id) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}
