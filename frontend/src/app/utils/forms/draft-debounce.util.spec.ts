import { Subject } from 'rxjs';

import { FORM_CHANGE_DEBOUNCE } from '@app/constants/forms';

import { draftDebounce } from './draft-debounce.util';

describe('draftDebounce', () => {
  let changes: Subject<string>;
  let saved: Subject<void>;
  let passed: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    changes = new Subject();
    saved = new Subject();
    passed = [];
    changes.pipe(draftDebounce(saved)).subscribe(change => passed.push(change));
  });

  afterEach(() => vi.useRealTimers());

  it('should pass the last change on once typing pauses', () => {
    changes.next('R');
    changes.next('Ro');
    vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE - 1);
    const beforePause = [...passed];

    vi.advanceTimersByTime(1);

    expect(beforePause).toEqual([]);
    expect(passed).toEqual(['Ro']);
  });

  it('should drop a waiting change when the form is saved', () => {
    changes.next('Rook');

    saved.next();
    vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

    expect(passed).toEqual([]);
  });

  it('should pass changes made after a save on as before', () => {
    saved.next();

    changes.next('Rook');
    vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

    expect(passed).toEqual(['Rook']);
  });
});
