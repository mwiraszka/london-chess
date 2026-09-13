import { Schema, model } from 'mongoose';

export interface AccountVerification {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

const accountVerificationSchema = new Schema<AccountVerification>(
  {
    email: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
    lastSentAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// Expired rows clean themselves up
accountVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const AccountVerificationModel = model<AccountVerification>(
  'AccountVerification',
  accountVerificationSchema,
);
