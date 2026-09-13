import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { r2Client } from './storage.service';

export type AvatarVariant = 'original' | 'cropped';

export function avatarPublicUrlPrefix(): string {
  const { R2_AVATARS_PUBLIC_URL } = process.env;
  if (!R2_AVATARS_PUBLIC_URL) {
    throw new Error('Unable to parse R2 environment variables.');
  }
  return R2_AVATARS_PUBLIC_URL;
}

function avatarKey(userId: string, variant: AvatarVariant): string {
  return `avatars/${userId}/${variant}`;
}

export function avatarPublicUrl(userId: string, variant: AvatarVariant): string {
  return `${avatarPublicUrlPrefix()}/${avatarKey(userId, variant)}`;
}

export async function uploadAvatar(
  userId: string,
  file: Buffer | ArrayBuffer,
  contentType: string,
  variant: AvatarVariant = 'original',
): Promise<string> {
  const s3 = r2Client();
  const key = avatarKey(userId, variant);

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env['R2_AVATARS_BUCKET_NAME'],
      Key: key,
      Body: file instanceof Buffer ? file : new Uint8Array(file),
      ContentType: contentType,
    }),
  );

  return avatarPublicUrl(userId, variant);
}

export async function deleteAvatar(userId: string): Promise<void> {
  const s3 = r2Client();

  await Promise.all(
    (['original', 'cropped'] as const).map(variant =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: process.env['R2_AVATARS_BUCKET_NAME'],
          Key: avatarKey(userId, variant),
        }),
      ),
    ),
  );
}
