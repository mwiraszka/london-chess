// Stands in for both '@clerk/backend' and the Clerk service, so no test reaches Clerk
export interface ClerkUserStub {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  hasImage: boolean;
  passwordEnabled: boolean;
  publicMetadata: Record<string, unknown>;
  primaryEmailAddress: { emailAddress: string } | null;
}

export interface ClerkSessionStub {
  id: string;
  lastActiveAt: number;
  latestActivity?: {
    isMobile: boolean;
    browserName?: string;
    deviceType?: string;
  };
}

export function clerkUser(overrides: Partial<ClerkUserStub> = {}): ClerkUserStub {
  return {
    id: 'user_test',
    firstName: 'Jane',
    lastName: 'Doe',
    imageUrl: 'https://img.clerk.com/placeholder',
    hasImage: false,
    passwordEnabled: true,
    publicMetadata: {},
    primaryEmailAddress: { emailAddress: 'jane@example.com' },
    ...overrides,
  };
}

export const clerkSecretKey = 'sk_test_unused';

interface ClerkSessionList {
  data: ClerkSessionStub[];
}

export const clerkClient = {
  users: {
    getUser: vi.fn<(id: string) => Promise<ClerkUserStub>>(async id => clerkUser({ id })),
    createUser: vi.fn<(params: Record<string, unknown>) => Promise<{ id: string }>>(
      async () => ({ id: 'user_new' }),
    ),
    updateUser: vi.fn<
      (id: string, params: Record<string, unknown>) => Promise<ClerkUserStub>
    >(async id => clerkUser({ id })),
    deleteUser: vi.fn<(id: string) => Promise<ClerkUserStub>>(async id =>
      clerkUser({ id }),
    ),
    verifyPassword: vi.fn<
      (params: { userId: string; password: string }) => Promise<{ verified: boolean }>
    >(async () => ({ verified: true })),
    updateUserProfileImage: vi.fn<
      (id: string, params: { file: Blob }) => Promise<ClerkUserStub>
    >(async id =>
      clerkUser({ id, hasImage: true, imageUrl: 'https://img.clerk.com/uploaded' }),
    ),
    deleteUserProfileImage: vi.fn<(id: string) => Promise<ClerkUserStub>>(async id =>
      clerkUser({ id }),
    ),
  },
  sessions: {
    getSessionList: vi.fn<
      (params: {
        userId: string;
        status: string;
        limit: number;
      }) => Promise<ClerkSessionList>
    >(async () => ({ data: [] })),
    revokeSession: vi.fn<(id: string) => Promise<{ id: string }>>(async id => ({ id })),
  },
};

export const TOKEN_PREFIX = 'test-token:';

// A token is the prefix followed by the Clerk user id it stands for
export const verifyToken = vi.fn(async (token: string) => {
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error('Invalid token.');
  }
  return { sub: token.slice(TOKEN_PREFIX.length), sid: 'sess_current' };
});

export function bearer(clerkUserId: string): string {
  return `Bearer ${TOKEN_PREFIX}${clerkUserId}`;
}
