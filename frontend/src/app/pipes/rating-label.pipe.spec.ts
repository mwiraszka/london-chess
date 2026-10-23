import { TestBed } from '@angular/core/testing';

import { RatingLabelPipe } from './rating-label.pipe';

describe('RatingLabelPipe', () => {
  let pipe: RatingLabelPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RatingLabelPipe] });
    pipe = TestBed.inject(RatingLabelPipe);
  });

  it('shows an unrated member and a rating from no rated games as unrated', () => {
    expect(pipe.transform('unrated')).toBe('Unrated');
    expect(pipe.transform('1000/0')).toBe('Unrated');
  });

  it('shows every other rating as it is', () => {
    expect(pipe.transform('1500')).toBe('1500');
    expect(pipe.transform('1180/4')).toBe('1180/4');
    expect(pipe.transform('1000')).toBe('1000');
    expect(pipe.transform('')).toBe('');
  });
});
