import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ApiService, MetaAndTitleService } from '@app/services';
import { query, queryAll } from '@app/utils';

import { AboutPageComponent } from './about-page.component';

describe('AboutPageComponent', () => {
  let fixture: ComponentFixture<AboutPageComponent>;
  let component: AboutPageComponent;

  let metaAndTitleService: MetaAndTitleService;

  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    const mockApiService: Pick<ApiService, 'get'> = {
      get: <T>() => Promise.resolve([] as T),
    };

    await TestBed.configureTestingModule({
      imports: [AboutPageComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);

    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
  });

  describe('initialization', () => {
    it('should set meta title and description', () => {
      component.ngOnInit();

      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('About');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render page header', () => {
      expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
    });

    it('should keep the location card with its map and links open', () => {
      const location = query(fixture.debugElement, '.about__location');

      expect(query(location, 'lcc-club-card')).toBeTruthy();
      expect(query(location, 'lcc-link-list').componentInstance.links()).toEqual([
        component.schedulePageLink,
        component.regionalClubsPageLink,
      ]);
    });

    it('should list every question in one accordion, each with its own icon', () => {
      const accordions = queryAll(fixture.debugElement, 'ea-accordion');
      const items = queryAll(fixture.debugElement, 'ea-accordion-item');

      expect(accordions).toHaveLength(1);
      expect(items).toHaveLength(11);
      items.forEach(item => expect(query(item, '.ea-accordion-item__icon')).toBeTruthy());
    });

    it('should highlight the questions that are open', () => {
      const [item] = queryAll(fixture.debugElement, 'ea-accordion-item');

      query(item, '.ea-accordion-item__trigger').nativeElement.click();
      fixture.detectChanges();

      expect(query(item, '.ea-accordion-item--highlighted')).toBeTruthy();
    });

    it('should reveal an answer when its question is opened and hide it again', () => {
      const [item] = queryAll(fixture.debugElement, 'ea-accordion-item');
      const trigger = query(item, '.ea-accordion-item__trigger');

      expect(query(item, '.ea-accordion-item__content')).toBeFalsy();

      trigger.nativeElement.click();
      fixture.detectChanges();

      expect(query(item, '.ea-accordion-item__content')).toBeTruthy();
      expect(trigger.attributes['aria-expanded']).toBe('true');

      trigger.nativeElement.click();
      fixture.detectChanges();

      expect(query(item, '.ea-accordion-item__content')).toBeFalsy();
    });

    it('should let several answers stay open at once', () => {
      const [first, second] = queryAll(fixture.debugElement, 'ea-accordion-item');

      query(first, '.ea-accordion-item__trigger').nativeElement.click();
      query(second, '.ea-accordion-item__trigger').nativeElement.click();
      fixture.detectChanges();

      expect(query(first, '.ea-accordion-item__content')).toBeTruthy();
      expect(query(second, '.ea-accordion-item__content')).toBeTruthy();
    });
  });
});
