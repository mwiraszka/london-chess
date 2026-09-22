import { scrollParentOf } from './scroll-parent.util';

describe('scrollParentOf', () => {
  it('should find the nearest ancestor that scrolls up and down', () => {
    const outer = document.createElement('div');
    const scroller = document.createElement('div');
    const inner = document.createElement('div');
    const child = document.createElement('span');
    outer.style.overflowY = 'scroll';
    scroller.style.overflowY = 'auto';
    outer.append(scroller);
    scroller.append(inner);
    inner.append(child);
    document.body.append(outer);

    expect(scrollParentOf(child)).toBe(scroller);
    expect(scrollParentOf(scroller)).toBe(outer);

    outer.remove();
  });

  it('should find nothing where no ancestor scrolls', () => {
    const child = document.createElement('span');
    document.body.append(child);

    expect(scrollParentOf(child)).toBeNull();

    child.remove();
  });
});
