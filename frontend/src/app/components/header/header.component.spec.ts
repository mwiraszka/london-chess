import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { query, queryAll, queryTextContent } from '@app/utils';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterModule.forRoot([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template rendering', () => {
    describe('branding section', () => {
      it('should include the LCC brand image', () => {
        expect(
          query(fixture.debugElement, '.branding-link img').nativeElement,
        ).toBeTruthy();
      });

      it('should link to the homepage via the LCC brand image', () => {
        expect(
          query(fixture.debugElement, '.branding-link').attributes['routerLink'],
        ).toBe('');
      });

      it('should include the club name', () => {
        expect(queryTextContent(fixture.debugElement, '.club-name-link')).toBe(
          'London Chess Club',
        );
      });

      it('should link to the homepage via the club name text', () => {
        expect(
          query(fixture.debugElement, '.club-name-link').attributes['routerLink'],
        ).toBe('');
      });
    });

    describe('chess pieces section', () => {
      it('should display the chess pieces SVG 5 times', () => {
        const imageElements = queryAll(fixture.debugElement, '.chess-pieces img');

        expect(imageElements.length).toBe(5);

        imageElements.forEach(element => {
          expect(element.attributes['src']).toBe('assets/chess-pieces.svg');
        });
      });
    });
  });
});
