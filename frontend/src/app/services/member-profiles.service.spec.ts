import { TestBed } from '@angular/core/testing';

import { MemberProfile } from '@app/models';
import { ApiService } from '@app/services/api.service';

import { MemberProfilesService } from './member-profiles.service';

describe('MemberProfilesService', () => {
  let service: MemberProfilesService;
  let getSpy: Mock;

  const jane: MemberProfile = {
    number: 7,
    firstName: 'Jane',
    lastName: 'Smith',
    rating: '1850',
    peakRating: '1900',
    avatarUrl: 'https://example.com/jane.webp',
  };
  const joe: MemberProfile = {
    number: 8,
    firstName: 'Joe',
    lastName: 'Bloggs',
    rating: '1200/5',
    peakRating: '1200/5',
    avatarUrl: null,
  };

  beforeEach(() => {
    getSpy = vi.fn().mockResolvedValue([jane, joe]);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { get: getSpy } }],
    });
    service = TestBed.inject(MemberProfilesService);
  });

  it('should load the profiles once however many ask for them', async () => {
    await Promise.all([service.load(), service.load()]);
    await service.load();

    expect(getSpy).toHaveBeenCalledExactlyOnceWith('/public/members/profiles');
    expect(service.profileFor(7)).toEqual(jane);
  });

  it('should list every profile by first name, then last', async () => {
    const jill = { ...jane, number: 9, lastName: 'Adams' };
    getSpy.mockResolvedValue([joe, jane, jill]);

    await service.load();

    expect(service.all()).toEqual([jill, jane, joe]);
  });

  it('should tell whether the profiles are loading, loaded or failed to load', async () => {
    getSpy.mockRejectedValueOnce(new Error('offline'));
    const statuses = [service.status()];

    await service.load();
    statuses.push(service.status());
    const retry = service.load();
    statuses.push(service.status());
    await retry;
    statuses.push(service.status());

    expect(statuses).toEqual(['loading', 'failed', 'loading', 'loaded']);
  });

  it('should keep the profiles loaded through a failed reload', async () => {
    await service.load();
    getSpy.mockRejectedValueOnce(new Error('offline'));

    await service.reload();

    expect(service.status()).toBe('loaded');
    expect(service.profileFor(7)).toEqual(jane);
  });

  it('should load the profiles again after a failed attempt', async () => {
    getSpy.mockRejectedValueOnce(new Error('offline'));
    await service.load();

    await service.load();

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(service.profileFor(8)).toEqual(joe);
  });

  it('should fetch fresh profiles on a reload', async () => {
    await service.load();
    getSpy.mockResolvedValue([{ ...jane, lastName: 'Jones' }]);

    await service.reload();

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(service.nameFor(7, 'Jane Smith')).toBe('Jane Jones');
    expect(service.profileFor(8)).toBeNull();
  });

  it('should name a member from their profile in either order, or keep the stored name', async () => {
    await service.load();

    expect(service.nameFor(7, 'J. Smith')).toBe('Jane Smith');
    expect(service.nameFor(7, 'J. Smith', 'last-first')).toBe('Smith, Jane');
    expect(service.nameFor(99, 'J. Smith')).toBe('J. Smith');
    expect(service.nameFor(null, 'J. Smith')).toBe('J. Smith');
  });

  it('should give the avatar of a member with a profile and one', async () => {
    await service.load();

    expect(service.avatarUrlFor(7)).toBe(jane.avatarUrl);
    expect(service.avatarUrlFor(8)).toBeUndefined();
    expect(service.avatarUrlFor(null)).toBeUndefined();
  });
});
