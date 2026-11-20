import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';
import {
  ArticleReactionModel,
  REACTION_EMOJIS,
  ReactionEmoji,
} from '../models/article-reaction.model';
import { ArticleModel } from '../models/article.model';
import { bearer } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import {
  MODIFICATION_INFO,
  createAccountHolder,
  createAdmin,
  createMember,
} from '../testing/fixtures';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

const MEMBER = 'user_member';

async function createArticle(): Promise<string> {
  const created = await ArticleModel.create({
    title: 'Club news',
    body: 'Body text',
    bannerImageId: 'image-1',
    bookmarkDate: null,
    modificationInfo: MODIFICATION_INFO,
  });
  return created._id.toString();
}

async function createReactor(number: number, clerkUserId = `user_${number}`) {
  return createAccountHolder({ clerkUserId }, { number });
}

async function react(
  articleId: string,
  memberId: Types.ObjectId,
  emoji: ReactionEmoji,
  reactedAt: string,
): Promise<void> {
  await ArticleReactionModel.create({
    articleId,
    memberId: memberId.toString(),
    emoji,
    reactedAt,
  });
}

const reactionPath = (articleId: string, emoji: string) =>
  `/v1/articles/${articleId}/reactions/${encodeURIComponent(emoji)}`;

describe('article reactions routes', () => {
  useTestDatabase();

  it('should offer one hundred different emojis', () => {
    expect(new Set(REACTION_EMOJIS).size).toBe(100);
  });

  describe('GET /v1/articles/:id/reactions', () => {
    it('should group the reactions by emoji, most given first, with the members in the order they reacted', async () => {
      const articleId = await createArticle();
      const first = await createReactor(1);
      const second = await createReactor(2);
      const third = await createReactor(3);
      await react(articleId, first._id, '🎉', '2026-11-01T10:00:00.000Z');
      await react(articleId, third._id, '👍', '2026-11-01T11:00:00.000Z');
      await react(articleId, first._id, '👍', '2026-11-01T12:00:00.000Z');
      await react(articleId, second._id, '❤️', '2026-11-01T13:00:00.000Z');

      const response = await request(app).get(`/v1/articles/${articleId}/reactions`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        { emoji: '👍', memberNumbers: [3, 1] },
        { emoji: '🎉', memberNumbers: [1] },
        { emoji: '❤️', memberNumbers: [2] },
      ]);
    });

    it('should leave out reactions from members who no longer have an account', async () => {
      const articleId = await createArticle();
      const member = await createReactor(1);
      const former = await createMember({ number: 2, account: null });
      await react(articleId, member._id, '🔥', '2026-11-01T10:00:00.000Z');
      await react(articleId, former._id, '🔥', '2026-11-01T11:00:00.000Z');
      await react(articleId, former._id, '😂', '2026-11-01T12:00:00.000Z');

      const response = await request(app).get(`/v1/articles/${articleId}/reactions`);

      expect(response.body.data).toEqual([{ emoji: '🔥', memberNumbers: [1] }]);
    });

    it('should return no reactions for an article nobody has reacted to', async () => {
      const articleId = await createArticle();

      const response = await request(app).get(`/v1/articles/${articleId}/reactions`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should respond with not found for an unknown or malformed article id', async () => {
      const unknown = await request(app).get(
        `/v1/articles/${new Types.ObjectId()}/reactions`,
      );
      const malformed = await request(app).get('/v1/articles/not-an-id/reactions');

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });
  });

  describe('PUT /v1/articles/:id/reactions/:emoji', () => {
    it("should add the member's reaction and return the article's reactions", async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-20T12:00:00.000Z'));
      const articleId = await createArticle();
      const member = await createReactor(7, MEMBER);

      const response = await request(app)
        .put(reactionPath(articleId, '♟️'))
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([{ emoji: '♟️', memberNumbers: [7] }]);
      expect(await ArticleReactionModel.findOne().lean()).toMatchObject({
        articleId,
        memberId: member._id.toString(),
        emoji: '♟️',
        reactedAt: '2026-11-20T12:00:00.000Z',
      });
    });

    it('should keep a single reaction, from when it was first given, when the same emoji is given again', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-20T12:00:00.000Z'));
      const articleId = await createArticle();
      await createReactor(7, MEMBER);
      const give = () =>
        request(app)
          .put(reactionPath(articleId, '👍'))
          .set('Authorization', bearer(MEMBER));
      await give();
      vi.setSystemTime(new Date('2026-11-21T12:00:00.000Z'));

      const response = await give();

      expect(response.body.data).toEqual([{ emoji: '👍', memberNumbers: [7] }]);
      expect(await ArticleReactionModel.find().lean()).toMatchObject([
        { reactedAt: '2026-11-20T12:00:00.000Z' },
      ]);
    });

    it('should let a member give an article more than one emoji', async () => {
      const articleId = await createArticle();
      await createReactor(7, MEMBER);

      await request(app)
        .put(reactionPath(articleId, '👍'))
        .set('Authorization', bearer(MEMBER));
      const response = await request(app)
        .put(reactionPath(articleId, '🎉'))
        .set('Authorization', bearer(MEMBER));

      expect(response.body.data).toEqual([
        { emoji: '👍', memberNumbers: [7] },
        { emoji: '🎉', memberNumbers: [7] },
      ]);
    });

    it('should reject an emoji that is not on offer', async () => {
      const articleId = await createArticle();
      await createReactor(7, MEMBER);

      const response = await request(app)
        .put(reactionPath(articleId, '🍍'))
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(400);
      expect(await ArticleReactionModel.countDocuments()).toBe(0);
    });

    it('should respond with not found for an unknown article', async () => {
      await createReactor(7, MEMBER);

      const response = await request(app)
        .put(reactionPath(new Types.ObjectId().toString(), '👍'))
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(404);
      expect(await ArticleReactionModel.countDocuments()).toBe(0);
    });

    it('should forbid a signed-in user with no member record', async () => {
      const articleId = await createArticle();

      const response = await request(app)
        .put(reactionPath(articleId, '👍'))
        .set('Authorization', bearer('user_stranger'));

      expect(response.status).toBe(403);
      expect(await ArticleReactionModel.countDocuments()).toBe(0);
    });
  });

  describe('DELETE /v1/articles/:id/reactions/:emoji', () => {
    it("should remove only the member's own reaction", async () => {
      const articleId = await createArticle();
      const member = await createReactor(7, MEMBER);
      const other = await createReactor(8);
      await react(articleId, member._id, '👍', '2026-11-01T10:00:00.000Z');
      await react(articleId, other._id, '👍', '2026-11-01T11:00:00.000Z');
      await react(articleId, member._id, '😂', '2026-11-01T12:00:00.000Z');

      const response = await request(app)
        .delete(reactionPath(articleId, '👍'))
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        { emoji: '👍', memberNumbers: [8] },
        { emoji: '😂', memberNumbers: [7] },
      ]);
    });

    it('should accept removing a reaction the member never gave', async () => {
      const articleId = await createArticle();
      await createReactor(7, MEMBER);

      const response = await request(app)
        .delete(reactionPath(articleId, '👍'))
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('when an article is deleted', () => {
    it('should delete its reactions too', async () => {
      const articleId = await createArticle();
      const otherArticleId = await createArticle();
      const member = await createReactor(7);
      await createAdmin();
      await react(articleId, member._id, '👍', '2026-11-01T10:00:00.000Z');
      await react(otherArticleId, member._id, '👍', '2026-11-01T10:00:00.000Z');

      await request(app)
        .delete(`/v1/articles/${articleId}`)
        .set('Authorization', bearer('user_admin'));

      expect(await ArticleReactionModel.find().lean()).toMatchObject([
        { articleId: otherArticleId },
      ]);
    });
  });
});
