import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DialogService } from '@app/services';
import { query, queryAll, queryTextContent } from '@app/utils';

import { EventsTableComponent } from './events-table.component';

describe('EventsTableComponent', () => {
  let fixture: ComponentFixture<EventsTableComponent>;
  let component: EventsTableComponent;

  let dialogService: DialogService;

  let dialogOpenSpy: MockInstance;
  let requestDeleteEventSpy: MockInstance;

  const mockEvents = MOCK_EVENTS.slice(0, 3);
  const mockIsAdmin = true;
  const mockNextEvent = mockEvents[1];
  const mockOptions = {
    page: 1,
    pageSize: 10,
    sortBy: 'eventDate',
    sortOrder: 'asc',
    filters: {
      showPastEvents: {
        label: 'Show past events',
        value: false,
      },
    },
    search: '',
  };
  const showModificationInfo = true;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlsDirective, AdminToolbarComponent, EventsTableComponent],
      providers: [
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsTableComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    requestDeleteEventSpy = vi.spyOn(component.requestDeleteEvent, 'emit');

    fixture.componentRef.setInput('events', mockEvents);
    fixture.componentRef.setInput('isAdmin', mockIsAdmin);
    fixture.componentRef.setInput('nextEvent', mockNextEvent);
    fixture.componentRef.setInput('options', mockOptions);
    fixture.componentRef.setInput('showModificationInfo', showModificationInfo);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showSkeleton', () => {
    it('should return true when isLoading is true', () => {
      fixture.componentRef.setInput('isLoading', true);

      expect(component.showSkeleton).toBe(true);
    });

    it('should return false when isLoading is false', () => {
      fixture.componentRef.setInput('isLoading', false);

      expect(component.showSkeleton).toBe(false);
    });

    it('should return false when isLoading is undefined', () => {
      expect(component.showSkeleton).toBe(false);
    });
  });

  describe('displayGroups', () => {
    it('should return groupedEvents when not loading', () => {
      fixture.componentRef.setInput('isLoading', false);

      expect(component.displayGroups).toEqual(component.groupedEvents);
    });

    it('should return dateLimit skeleton groups when loading with dateLimit', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('dateLimit', 5);

      expect(component.displayGroups).toHaveLength(5);
    });

    it('should return pageSize skeleton groups when loading with specific pageSize', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', { ...mockOptions, pageSize: 15 });

      expect(component.displayGroups).toHaveLength(15);
    });

    it('should return 50 skeleton groups when loading with pageSize -1 and showPastEvents false', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', {
        ...mockOptions,
        pageSize: -1,
        filters: { showPastEvents: { label: 'Show past events', value: false } },
      });

      expect(component.displayGroups).toHaveLength(50);
    });

    it('should return 200 skeleton groups when loading with pageSize -1 and showPastEvents true', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', {
        ...mockOptions,
        pageSize: -1,
        filters: { showPastEvents: { label: 'Show past events', value: true } },
      });

      expect(component.displayGroups).toHaveLength(200);
    });

    it('should return 50 skeleton groups when loading with no options', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('options', undefined);

      expect(component.displayGroups).toHaveLength(50);
    });

    it('should create skeleton groups with unique dateKeys and one event each', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('dateLimit', 3);

      const groups = component.displayGroups;

      expect(groups[0].dateKey).toBe('skeleton-0');
      expect(groups[1].dateKey).toBe('skeleton-1');
      expect(groups[2].dateKey).toBe('skeleton-2');
      groups.forEach(group => {
        expect(group.events).toHaveLength(1);
        expect(group.hasNextEvent).toBe(false);
      });
    });
  });

  describe('groupedEvents', () => {
    it('should return one group per unique date when all events are on different dates', () => {
      const groups = component.groupedEvents;

      expect(groups.length).toBe(mockEvents.length);
      groups.forEach((group, i) => {
        expect(group.events).toEqual([mockEvents[i]]);
        expect(group.dateKey).toBe(mockEvents[i].eventDate.slice(0, 10));
      });
    });

    it('should merge events on the same date into one group', () => {
      const sharedDate = mockEvents[0].eventDate;
      const eventsWithSharedDate = [
        mockEvents[0],
        { ...mockEvents[1], eventDate: sharedDate },
        mockEvents[2],
      ];
      fixture.componentRef.setInput('events', eventsWithSharedDate);

      const groups = component.groupedEvents;

      expect(groups.length).toBe(2);
      expect(groups[0].events.length).toBe(2);
      expect(groups[1].events.length).toBe(1);
    });

    it('should mark group as hasNextEvent when it contains the next event', () => {
      const groups = component.groupedEvents;
      const nextEventGroup = groups.find(g => g.hasNextEvent);

      expect(nextEventGroup).toBeDefined();
      expect(nextEventGroup!.events.some(e => e.id === mockNextEvent.id)).toBe(true);
    });

    it('should limit groups to dateLimit when provided', () => {
      fixture.componentRef.setInput('dateLimit', 2);

      expect(component.groupedEvents.length).toBe(2);
    });

    it('should return all groups when dateLimit is not provided', () => {
      fixture.componentRef.setInput('dateLimit', undefined);

      expect(component.groupedEvents.length).toBe(mockEvents.length);
    });
  });

  describe('getAdminControlsConfig', () => {
    it('should return correct configuration for an event', () => {
      const event = mockEvents[0];
      const config = component.getAdminControlsConfig(event);

      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['event', 'edit', event.id]);
      expect(config.itemName).toBe(event.title);
      expect(config.deleteCb).toBeDefined();
    });
  });

  describe('onDeleteEvent', () => {
    it('should open confirmation dialog with correct parameters', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      await component.onDeleteEvent(mockEvents[0]);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Delete ${mockEvents[0].title}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          },
        },
        isModal: true,
      });
    });

    it('should emit request delete event when user confirms', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      await component.onDeleteEvent(mockEvents[2]);

      expect(requestDeleteEventSpy).toHaveBeenCalledWith(mockEvents[2]);
    });

    it('should not emit request delete event when user cancels', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');
      await component.onDeleteEvent(mockEvents[2]);

      expect(requestDeleteEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    describe('when loading', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('isLoading', true);
        fixture.componentRef.setInput('dateLimit', 3);
        fixture.detectChanges();
      });

      it('should render skeleton rows with placeholder elements', () => {
        expect(query(fixture.debugElement, '.skeleton-date-widget')).toBeTruthy();
        expect(query(fixture.debugElement, '.skeleton-main-content')).toBeTruthy();
      });

      it('should not render real date widgets or event entries', () => {
        expect(query(fixture.debugElement, '.date-text')).toBeFalsy();
        expect(query(fixture.debugElement, '.title')).toBeFalsy();
        expect(query(fixture.debugElement, '.event-details')).toBeFalsy();
      });

      it('should render the correct number of skeleton rows', () => {
        const rows = queryAll(fixture.debugElement, 'tbody tr[id]');

        expect(rows.length).toBe(3);
      });
    });

    describe('events table', () => {
      it('should render table with correct headers', () => {
        expect(query(fixture.debugElement, 'table.lcc-table')).toBeTruthy();

        const headers = queryAll(fixture.debugElement, 'th');
        expect(headers.length).toBe(2);
        expect(headers[0].nativeElement.textContent.trim()).toBe('Event');
        expect(headers[1].nativeElement.textContent.trim()).toBe('');
      });

      it('should render a row for every date group and use first event ID', () => {
        const eventRows = queryAll(fixture.debugElement, 'tbody tr[id]');

        expect(eventRows.length).toBe(component.groupedEvents.length);
        expect(eventRows[0].nativeElement.id).toBe(
          component.groupedEvents[0].events[0].id,
        );
      });

      it('should add today-scroll-point class to the row containing the next event', () => {
        const nextEventGroup = component.groupedEvents.find(g => g.hasNextEvent)!;

        expect(
          query(fixture.debugElement, `tr#${nextEventGroup.events[0].id}`).classes[
            'today-scroll-point'
          ],
        ).toBe(true);
      });

      it('should display today line when next event is shown with past events', () => {
        const options = {
          ...mockOptions,
          filters: {
            showPastEvents: {
              label: 'Show past events',
              value: true,
            },
          },
        };
        fixture.componentRef.setInput('options', options);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.today-line')).toBeTruthy();
      });

      it('should display all event dates in date widget format', () => {
        const dateWidgetElements = queryAll(fixture.debugElement, '.event-date-widget');

        dateWidgetElements.forEach(element => {
          expect(queryAll(element, '.date-text').length).toBe(3); // day-of-week, month-day, year
        });
      });

      it('should display event titles and details for all events', () => {
        const allEvents = component.groupedEvents.flatMap(g => g.events);
        const titleElements = queryAll(fixture.debugElement, '.title');
        const detailElements = queryAll(fixture.debugElement, '.event-details');

        titleElements.forEach((element, i) => {
          expect(element.nativeElement.textContent.trim()).toBe(allEvents[i].title);
        });

        detailElements.forEach((element, i) => {
          expect(element.nativeElement.textContent.trim()).toBe(allEvents[i].details);
        });
      });

      it('should display event types with correct styling', () => {
        expect(
          query(fixture.debugElement, '.type-container').classes[
            'blitz-tournament-10-mins'
          ],
        ).toBe(true);

        expect(queryTextContent(fixture.debugElement, '.type')).toBe(
          'blitz tournament (10 mins)',
        );
      });

      it('should display championship icon for championship events', () => {
        const championshipEvent = mockEvents.find(event => event.type === 'championship');
        fixture.componentRef.setInput('events', [championshipEvent!]);
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, 'ea-icon-trophy.championship-icon'),
        ).toBeTruthy();
      });

      it('should link to article when event has articleId', () => {
        const eventWithArticle = mockEvents.find(event => event.articleId !== '');
        fixture.componentRef.setInput('events', [eventWithArticle!]);
        fixture.detectChanges();

        const articleLink = query(fixture.debugElement, '.event-article-link');
        expect(articleLink.nativeElement.getAttribute('href')).toBe(
          '/article/view/' + eventWithArticle!.articleId,
        );
        expect(articleLink.nativeElement.textContent.trim()).toBe(
          eventWithArticle!.title,
        );
      });

      it('should not display article link when event has no articleId', () => {
        const eventWithoutArticle = mockEvents.find(event => event.articleId === '');
        fixture.componentRef.setInput('events', [eventWithoutArticle!]);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.event-article-link')).toBeFalsy();
      });

      it('should display modification info when showModificationInfo is true', () => {
        fixture.componentRef.setInput('showModificationInfo', true);
        fixture.detectChanges();

        const modInfoText = queryTextContent(fixture.debugElement, '.created-and-edited');
        expect(modInfoText).toContain('Event created');
        expect(modInfoText).toContain('Last edited');
      });

      it('should not display modification info when showModificationInfo is false', () => {
        fixture.componentRef.setInput('showModificationInfo', false);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.created-and-edited')).toBeFalsy();
      });

      it('should show admin controls on event entries when isAdmin is true', () => {
        fixture.componentRef.setInput('isAdmin', true);
        fixture.detectChanges();

        expect(component.getAdminControlsConfig(mockEvents[0])).toBeTruthy();
        expect(query(fixture.debugElement, '.event-entry .main-content')).toBeTruthy();
      });
    });
  });
});
