import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query } from '@app/utils';

import { TextSkeletonComponent } from './text-skeleton.component';

describe('TextSkeletonComponent', () => {
  let fixture: ComponentFixture<TextSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextSkeletonComponent);
    fixture.componentRef.setInput('width', '12ch');
    fixture.detectChanges();
  });

  it('should take the width it is given', () => {
    expect(fixture.nativeElement.style.width).toBe('12ch');
  });

  it('should hold a line of text so it keeps the height of the text it stands in for', () => {
    expect(fixture.nativeElement.textContent).toBe(' ');
  });

  it('should cover that line with a text skeleton', () => {
    const skeleton = query(fixture.debugElement, 'ea-skeleton.bar');

    expect(skeleton.componentInstance.variant()).toBe('text');
    expect(skeleton.componentInstance.width()).toBe('100%');
    expect(skeleton.componentInstance.height()).toBe('100%');
  });

  it('should be hidden from assistive technology', () => {
    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });
});
