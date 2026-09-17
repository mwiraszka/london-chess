import { ComponentFixture, TestBed } from '@angular/core/testing';

import { queryAll } from '@app/utils';

import { FormSkeletonComponent } from './form-skeleton.component';

describe('FormSkeletonComponent', () => {
  let fixture: ComponentFixture<FormSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormSkeletonComponent);
  });

  it('should show one label and control per field', () => {
    fixture.componentRef.setInput('fieldCount', 3);

    fixture.detectChanges();

    expect(queryAll(fixture.debugElement, '.label')).toHaveLength(3);
    expect(queryAll(fixture.debugElement, '.control')).toHaveLength(3);
  });

  it('should mark itself as busy for assistive technology', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('aria-busy')).toBe('true');
  });
});
