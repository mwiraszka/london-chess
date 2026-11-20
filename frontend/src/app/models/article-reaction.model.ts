export interface ReactionEmojiOption {
  emoji: string;
  name: string;
}

// The members who gave an emoji, in the order they did
export interface ReactionGroup {
  emoji: string;
  memberNumbers: number[];
}
