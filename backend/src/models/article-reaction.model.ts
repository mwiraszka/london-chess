import { Schema, model } from 'mongoose';

import { Id, IsoDate } from './core.model';

// The emojis a member can react to an article with, kept in step with the site's picker
export const REACTION_EMOJIS = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '🤣',
  '😂',
  '🙂',
  '🙃',
  '😉',
  '😊',
  '😇',
  '🥰',
  '😍',
  '🤩',
  '😘',
  '😋',
  '😜',
  '🤪',
  '🤗',
  '🤭',
  '🤔',
  '🤨',
  '😐',
  '😏',
  '🙄',
  '😬',
  '😌',
  '😴',
  '🥱',
  '🤯',
  '🥳',
  '😎',
  '🤓',
  '🧐',
  '😕',
  '😮',
  '😲',
  '😳',
  '🥺',
  '😢',
  '😭',
  '😱',
  '😤',
  '😡',
  '😈',
  '💀',
  '🤡',
  '🙈',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🙏',
  '🤝',
  '👋',
  '✌️',
  '🤞',
  '👌',
  '💪',
  '🤷',
  '🤦',
  '👀',
  '🧠',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '💔',
  '🎉',
  '🎊',
  '🎂',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '🏅',
  '👑',
  '💯',
  '🔥',
  '✨',
  '⭐',
  '🌟',
  '💥',
  '⚡',
  '♟️',
  '🐴',
  '🏰',
  '🐐',
  '🎯',
  '🧩',
  '🎲',
  '⏰',
  '⏳',
  '📈',
  '📉',
  '🚀',
] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value);
}

export interface ArticleReaction {
  articleId: Id;
  memberId: Id;
  emoji: ReactionEmoji;
  reactedAt: IsoDate;
}

// The member numbers come in the order the members reacted
export interface ReactionGroup {
  emoji: ReactionEmoji;
  memberNumbers: number[];
}

const articleReactionSchema = new Schema<ArticleReaction>(
  {
    articleId: { type: String, required: true },
    memberId: { type: String, required: true },
    emoji: { type: String, enum: REACTION_EMOJIS, required: true },
    reactedAt: { type: String, required: true },
  },
  { versionKey: false },
);

articleReactionSchema.index({ articleId: 1, memberId: 1, emoji: 1 }, { unique: true });
articleReactionSchema.index({ memberId: 1 });

export const ArticleReactionModel = model<ArticleReaction>(
  'ArticleReaction',
  articleReactionSchema,
);
