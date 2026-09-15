import { HomeIconComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryTextContent } from '@app/utils';

import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('heading', 'Mock Heading');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should always display heading', () => {
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, '.page-heading')).toBe(
        'Mock Heading',
      );
    });

    it('should display icon when provided', () => {
      fixture.componentRef.setInput('icon', HomeIconComponent);
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-icon-home')).toBeTruthy();
    });

    it('should not display icon when not provided', () => {
      fixture.componentRef.setInput('icon', null);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.page-header-icon')).toBeFalsy();
    });

    it('should add end-with-asterisk class when hasUnsavedChanges is true', () => {
      fixture.componentRef.setInput('hasUnsavedChanges', true);
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.page-heading').classes['end-with-asterisk'],
      ).toBe(true);
    });

    it('should not add end-with-asterisk class when hasUnsavedChanges is false', () => {
      fixture.componentRef.setInput('hasUnsavedChanges', false);
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.page-heading').classes['end-with-asterisk'],
      ).toBeUndefined();
    });

    it('should not add end-with-asterisk class when hasUnsavedChanges is null', () => {
      fixture.componentRef.setInput('hasUnsavedChanges', null);
      fixture.detectChanges();

      expect(
        query(fixture.debugElement, '.page-heading').classes['end-with-asterisk'],
      ).toBeUndefined();
    });
  });
});
