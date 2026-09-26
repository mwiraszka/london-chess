import { TestBed } from '@angular/core/testing';

import { RouterLinkPipe } from './router-link.pipe';

describe('RouterLinkPipe', () => {
  let pipe: RouterLinkPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RouterLinkPipe] });
    pipe = TestBed.inject(RouterLinkPipe);
  });

  it('transforms InternalPath objects correctly', () => {
    expect(pipe.transform(undefined)).toStrictEqual(undefined);
    expect(pipe.transform('member')).toStrictEqual('/member');
    expect(pipe.transform(['member', 'add'])).toStrictEqual('/member/add');
    expect(pipe.transform(['member', 'add', 'mock-id'])).toStrictEqual(
      '/member/add/mock-id',
    );
  });
});
