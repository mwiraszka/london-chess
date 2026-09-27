describe('clerk service', () => {
  it('should refuse to load without a secret key', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '');
    vi.resetModules();

    await expect(import('./clerk.service.js')).rejects.toThrow(
      'Unable to parse Clerk environment variables.',
    );
  });

  it('should expose the secret key it was loaded with', async () => {
    vi.resetModules();

    const { clerkSecretKey } = await import('./clerk.service.js');

    expect(clerkSecretKey).toBe('sk_test_unused');
  });
});
