import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryTextContent } from '@app/utils';

import { LoadFailedComponent } from './load-failed.component';

describe('LoadFailedComponent', () => {
  let fixture: ComponentFixture<LoadFailedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadFailedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadFailedComponent);
    fixture.componentRef.setInput('title', 'Unable to load articles');
    fixture.detectChanges();
  });

  it('should explain what could not be loaded', () => {
    expect(queryTextContent(fixture.debugElement, '.ea-empty-state__title')).toBe(
      'Unable to load articles',
    );
    expect(queryTextContent(fixture.debugElement, '.ea-empty-state__description')).toBe(
      'Please check your connection and try again.',
    );
  });

  it('should ask for another attempt when the button is clicked', () => {
    const retrySpy = vi.fn();
    fixture.componentInstance.retry.subscribe(retrySpy);

    query(fixture.debugElement, 'ea-button button').nativeElement.click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
