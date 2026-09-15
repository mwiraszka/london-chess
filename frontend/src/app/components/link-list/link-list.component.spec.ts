import { GlobeIconComponent, HomeIconComponent } from '@eagami/ui';

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { ExternalLink, InternalLink } from '@app/models';
import { RouterLinkPipe } from '@app/pipes';
import { query, queryAll, queryTextContent } from '@app/utils';

import { LinkListComponent } from './link-list.component';

@Component({
  template: '',
})
class LoginPageStubComponent {}

describe('LinkListComponent', () => {
  let fixture: ComponentFixture<LinkListComponent>;

  const mockInternalLinks: InternalLink[] = [
    {
      text: 'Home Link',
      internalPath: '',
      icon: HomeIconComponent,
    },
    {
      text: 'Article Edit Link',
      internalPath: ['article', 'edit', MOCK_ARTICLES[0].id],
      tooltip: 'A link to a particular article in edit mode',
    },
  ];

  const mockExternalLinks: ExternalLink[] = [
    {
      text: 'External Link 1',
      externalPath: 'https://example.com',
      icon: GlobeIconComponent,
    },
    {
      text: 'External Link 2',
      externalPath: 'https://test.com',
      tooltip: 'External link tooltip',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkListComponent, RouterLink, RouterLinkPipe, TooltipDirective],
      providers: [
        provideRouter([
          {
            path: 'login',
            component: LoginPageStubComponent,
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should render header when provided', () => {
      fixture.componentRef.setInput('header', 'Mock Header');
      fixture.detectChanges();

      expect(queryTextContent(fixture.debugElement, 'h3')).toBe('Mock Header');
    });

    it('should not render header when not provided', () => {
      fixture.componentRef.setInput('header', undefined);
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'h3')).toBeFalsy();
    });

    it('should render internal links correctly', () => {
      fixture.componentRef.setInput('links', mockInternalLinks);
      fixture.detectChanges();

      const linkElements = queryAll(fixture.debugElement, '.lcc-link');
      expect(linkElements.length).toBe(mockInternalLinks.length);

      linkElements.forEach((linkElement, i) => {
        expect(queryTextContent(linkElement, 'div')).toBe(mockInternalLinks[i].text);

        if (mockInternalLinks[i].icon) {
          expect(query(linkElement, 'ea-icon-home')).toBeTruthy();
        }

        if (mockInternalLinks[i].tooltip) {
          const tooltipDirective = linkElement.injector.get(TooltipDirective);
          expect(tooltipDirective.tooltip).toBe(mockInternalLinks[i].tooltip);
        }
      });
    });

    it('should render external links correctly', () => {
      fixture.componentRef.setInput('links', mockExternalLinks);
      fixture.detectChanges();

      const linkElements = queryAll(fixture.debugElement, '.lcc-link');
      expect(linkElements.length).toBe(mockExternalLinks.length);

      linkElements.forEach((linkElement, i) => {
        expect(queryTextContent(linkElement, 'div')).toBe(mockExternalLinks[i].text);

        expect(linkElement.attributes['href']).toBe(mockExternalLinks[i].externalPath);
        expect(linkElement.attributes['target']).toBe('_blank');

        expect(query(linkElement, 'ea-icon-external-link')).toBeTruthy();

        if (mockExternalLinks[i].icon) {
          expect(query(linkElement, 'ea-icon-globe')).toBeTruthy();
        }

        if (mockExternalLinks[i].tooltip) {
          const tooltipDirective = linkElement.injector.get(TooltipDirective);
          expect(tooltipDirective.tooltip).toBe(mockExternalLinks[i].tooltip);
        }
      });
    });

    it('should apply single-column class when links length is less than 4', () => {
      fixture.componentRef.setInput('links', mockInternalLinks);
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ul').classes['single-column']).toBe(true);
    });

    it('should not apply single-column class when links length is 4 or more', () => {
      fixture.componentRef.setInput('links', [
        ...mockInternalLinks,
        ...mockExternalLinks,
      ]);
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ul').classes['single-column']).toBeUndefined();
    });
  });
});
