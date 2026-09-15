import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryTextContent } from '@app/utils';

import { SafeModeNoticeComponent } from './safe-mode-notice.component';

describe('SafeModeNoticeComponent', () => {
  let fixture: ComponentFixture<SafeModeNoticeComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SafeModeNoticeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SafeModeNoticeComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should use given entity in aside text', () => {
      fixture.componentRef.setInput('entity', 'Michal');
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, 'aside')).toContain('Michal');
    });

    it('should render a checkmark icon', () => {
      fixture.componentRef.setInput('entity', 'User');
      fixture.detectChanges();
      expect(query(fixture.debugElement, 'ea-icon-check-circle')).toBeTruthy();
    });
  });
});
