import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryAll, queryTextContent } from '@app/utils';

import { ClubLinksComponent } from './club-links.component';

describe('ClubLinksComponent', () => {
  let fixture: ComponentFixture<ClubLinksComponent>;
  let component: ClubLinksComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubLinksComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should render links with an image, text and open in new tab icon for each of the four sections', () => {
      const linkElements = queryAll(fixture.debugElement, 'section a');

      expect(linkElements.length).toBe(4);

      linkElements.forEach(linkElement => {
        expect(query(linkElement, 'ea-icon-external-link')).toBeTruthy();
        expect(query(linkElement, '.image-container img')).toBeTruthy();
        expect(queryTextContent(linkElement, 'span')).toBeTruthy();
      });
    });
  });
});
