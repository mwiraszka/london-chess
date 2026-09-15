import { RouterLinkPipe } from './router-link.pipe';

describe('RouterLinkPipe', () => {
  const pipe = new RouterLinkPipe();

  it('transforms InternalPath objects correctly', () => {
    expect(pipe.transform(undefined)).toStrictEqual(undefined);
    expect(pipe.transform('member')).toStrictEqual('/member');
    expect(pipe.transform(['member', 'add'])).toStrictEqual('/member/add');
    expect(pipe.transform(['member', 'add', 'mock-id'])).toStrictEqual(
      '/member/add/mock-id',
    );
  });
});
