// The client is kept between calls, so each test loads a fresh copy of the service
async function loadService() {
  vi.resetModules();
  return import('./storage.service.js');
}

describe('storage service', () => {
  beforeEach(() => {
    vi.stubEnv('R2_ACCOUNT_ID', 'account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('R2_IMAGES_BUCKET_NAME', 'images');
  });

  it('should create one client for the account', async () => {
    const { r2Client } = await loadService();

    const client = r2Client();

    expect(r2Client()).toBe(client);
    expect(await client.config.endpoint?.()).toMatchObject({
      hostname: 'account.r2.cloudflarestorage.com',
    });
  });

  it('should refuse to create a client without credentials', async () => {
    vi.stubEnv('R2_SECRET_ACCESS_KEY', '');
    const { r2Client } = await loadService();

    expect(() => r2Client()).toThrow('Unable to parse R2 environment variables.');
  });

  it('should name the images bucket from the environment', async () => {
    const { imagesBucket } = await loadService();

    const withBucket = imagesBucket();
    vi.stubEnv('R2_IMAGES_BUCKET_NAME', '');

    expect(withBucket).toBe('images');
    expect(() => imagesBucket()).toThrow('Unable to parse R2 environment variables.');
  });
});
