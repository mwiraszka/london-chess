import { Schema, Types, model } from 'mongoose';

import { Id } from './core.model';

export interface Player {
  id: Id;
  // An initial such as "G." when the archive never recorded the full name
  firstName: string;
  lastName: string;
  suffix: string;
  // Links the player to a member, whose current name then stands in for these
  memberId: Id | null;
  gameCount: number;
}

export type PlayerRecord = Omit<Player, 'id'> & { _id: Types.ObjectId };

const playerSchema = new Schema<Player>(
  {
    firstName: { type: String, default: '' },
    lastName: { type: String, required: true },
    suffix: { type: String, default: '' },
    memberId: { type: String, default: null },
    gameCount: { type: Number, default: 0 },
  },
  { versionKey: false },
);

playerSchema.index({ lastName: 1, firstName: 1 });
playerSchema.index({ memberId: 1 });

export const PlayerModel = model<Player>('Player', playerSchema);
