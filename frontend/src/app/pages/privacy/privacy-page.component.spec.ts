import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetaAndTitleService } from '@app/services';
import { query, queryAll, queryTextContent } from '@app/utils';

import { PrivacyPageComponent } from './privacy-page.component';

describe('PrivacyPageComponent', () => {
  let fixture: ComponentFixture<PrivacyPageComponent>;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPageComponent],
    }).compileComponents();

    updateTitleSpy = vi.spyOn(TestBed.inject(MetaAndTitleService), 'updateTitle');
    fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
  });

  it('should title the page', () => {
    expect(updateTitleSpy).toHaveBeenCalledWith('Privacy');
  });

  it('should cover what is kept, who sees it and how to have it removed', () => {
    const headings = queryAll(fixture.debugElement, '.privacy h3').map(heading =>
      heading.nativeElement.textContent.trim(),
    );

    expect(headings).toEqual([
      'What we keep',
      'Who can see it',
      'Emails we send',
      'Services that help run the site',
      'In your browser',
      'Your choices',
      'Contact us',
    ]);
  });

  it('should send questions to the privacy email address', () => {
    const contact = query(fixture.debugElement, '.privacy a[href^="mailto:"]');

    expect(contact.attributes['href']).toBe('mailto:privacy@londonchess.ca');
    expect(queryTextContent(fixture.debugElement, '.privacy a[href^="mailto:"]')).toBe(
      'privacy@londonchess.ca',
    );
  });
});
