import { Types } from 'mongoose';

import {
  ArticleReaction,
  ArticleReactionModel,
  ReactionEmoji,
  ReactionGroup,
} from '../models/article-reaction.model';
import { Id } from '../models/core.model';
import { MemberModel, MemberName } from '../models/member.model';
import { isCollectionId } from '../util/is-collection-id.util';

// Most given first, ties in the order each emoji was first given. Only members who
// still have an account count, as only they have a profile to show beside the emoji
export async function findReactionGroups(articleId: Id): Promise<ReactionGroup[]> {
  const reactions = await ArticleReactionModel.find({ articleId })
    .sort({ reactedAt: 1, _id: 1 })
    .lean<ArticleReaction[]>();

  const memberIds = [...new Set(reactions.map(({ memberId }) => memberId))].filter(
    isCollectionId,
  );
  const members = memberIds.length
    ? await MemberModel.find(
        {
          _id: { $in: memberIds.map(id => new Types.ObjectId(id)) },
          'account.clerkUserId': { $type: 'string' },
        },
        { number: 1 },
      ).lean<Pick<MemberName, '_id' | 'number'>[]>()
    : [];
  const numbersById = new Map(
    members.flatMap(({ _id, number }) =>
      typeof number === 'number' ? [[_id.toString(), number] as const] : [],
    ),
  );

  const groups = new Map<ReactionEmoji, number[]>();
  for (const { emoji, memberId } of reactions) {
    const number = numbersById.get(memberId);
    if (number !== undefined) {
      groups.set(emoji, [...(groups.get(emoji) ?? []), number]);
    }
  }

  return [...groups]
    .map(([emoji, memberNumbers]) => ({ emoji, memberNumbers }))
    .sort((a, b) => b.memberNumbers.length - a.memberNumbers.length);
}
