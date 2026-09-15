import { ClerkUserEventData, toProfile } from './webhooks.controller';

describe('toProfile', () => {
  const baseData: ClerkUserEventData = {
    id: 'user_123',
    first_name: 'John',
    last_name: 'Doe',
    email_addresses: [
      { id: 'idn_1', email_address: 'secondary@example.com' },
      { id: 'idn_2', email_address: 'primary@example.com' },
    ],
    primary_email_address_id: 'idn_2',
    image_url: 'https://img.clerk.com/photo',
    has_image: true,
    public_metadata: { isAdmin: true },
  };

  it('should map a Clerk user payload to a profile', () => {
    const profile = toProfile(baseData);

    expect(profile).toEqual({
      id: 'user_123',
      email: 'primary@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://img.clerk.com/photo',
      hasImage: true,
      isAdmin: true,
      memberId: null,
    });
  });

  it('should carry the member id from the public metadata', () => {
    const data: ClerkUserEventData = {
      ...baseData,
      public_metadata: { memberId: '507f1f77bcf86cd799439011' },
    };

    const profile = toProfile(data);

    expect(profile.memberId).toBe('507f1f77bcf86cd799439011');
  });

  it('should ignore a member id that is not a string', () => {
    const profile = toProfile({ ...baseData, public_metadata: { memberId: 42 } });

    expect(profile.memberId).toBeNull();
  });

  it('should fall back to the first email address when the primary id does not match', () => {
    const data: ClerkUserEventData = { ...baseData, primary_email_address_id: 'idn_9' };

    const profile = toProfile(data);

    expect(profile.email).toBe('secondary@example.com');
  });

  it('should treat missing or non-true admin metadata as non-admin', () => {
    const withoutMetadata = toProfile({ ...baseData, public_metadata: undefined });
    const withFalse = toProfile({ ...baseData, public_metadata: { isAdmin: false } });
    const withString = toProfile({ ...baseData, public_metadata: { isAdmin: 'yes' } });

    expect(withoutMetadata.isAdmin).toBe(false);
    expect(withFalse.isAdmin).toBe(false);
    expect(withString.isAdmin).toBe(false);
  });

  it('should default missing fields to empty values', () => {
    const profile = toProfile({ id: 'user_456' });

    expect(profile).toEqual({
      id: 'user_456',
      email: '',
      firstName: '',
      lastName: '',
      imageUrl: '',
      hasImage: false,
      isAdmin: false,
      memberId: null,
    });
  });
});
