import { createHmac } from 'node:crypto';

// Signs like Clerk does, with the signing secret set in vitest.config.ts
export function webhookHeaders(signedPayload: string): Record<string, string> {
  const id = 'msg_123';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', Buffer.from('dGVzdC1zZWNyZXQ=', 'base64'))
    .update(`${id}.${timestamp}.${signedPayload}`)
    .digest('base64');

  return {
    'content-type': 'application/json',
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': `v1,${signature}`,
  };
}
