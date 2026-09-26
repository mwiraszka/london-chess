// Stands in for the R2 storage service, so no test reaches Cloudflare
export interface StorageCommand {
  input: { Bucket?: string; Key?: string; ContentType?: string };
}

interface StorageResponse {
  $metadata: { httpStatusCode?: number };
}

export const send = vi.fn<(command: StorageCommand) => Promise<StorageResponse>>(
  async () => ({ $metadata: { httpStatusCode: 200 } }),
);

export function r2Client() {
  return { send };
}

export function imagesBucket(): string {
  return 'images';
}

export function sentKeys(): (string | undefined)[] {
  return send.mock.calls.map(([command]) => command.input.Key);
}

export const getSignedUrl = vi.fn<
  (
    client: object,
    command: StorageCommand,
    options: { expiresIn: number },
  ) => Promise<string>
>(async (_client, command) => `https://signed.test/${command.input.Key}`);
