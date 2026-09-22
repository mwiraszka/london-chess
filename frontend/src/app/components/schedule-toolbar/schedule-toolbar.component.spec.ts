import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { DialogService } from '@app/services';
import { EXPORT_EVENTS_TO_ICAL } from '@app/tokens';
import { query } from '@app/utils';

import { ScheduleToolbarComponent } from './schedule-toolbar.component';

describe('ScheduleToolbarComponent', () => {
  let component: ScheduleToolbarComponent;
  let fixture: ComponentFixture<ScheduleToolbarComponent>;
  let dialogService: DialogService;

  let dateToISOStringSpy: MockInstance;
  let exportEventsToIcalSpy: MockInstance;
  let todayScrollPointSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleToolbarComponent],
      providers: [
        { provide: EXPORT_EVENTS_TO_ICAL, useValue: vi.fn() },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleToolbarComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    dateToISOStringSpy = vi.spyOn(Date.prototype, 'toISOString');
    exportEventsToIcalSpy = TestBed.inject(EXPORT_EVENTS_TO_ICAL) as Mock;

    // Set up the spy before any change detection with a default return value
    todayScrollPointSpy = vi
      .spyOn(component, 'todayScrollPoint', 'get')
      .mockReturnValue(document.createElement('div'));

    fixture.componentRef.setInput('scheduleView', 'list');
    fixture.componentRef.setInput('filteredEvents', MOCK_EVENTS.slice(0, 3));
    fixture.componentRef.setInput('totalCount', MOCK_EVENTS.length);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onExportToIcal', () => {
    it('should call exportEventsToIcal with events and filename', async () => {
      exportEventsToIcalSpy.mockReturnValue(3);
      vi.spyOn(dialogService, 'open').mockResolvedValue('confirm');

      await component.onExportToIcal();

      expect(exportEventsToIcalSpy).toHaveBeenCalledWith(
        MOCK_EVENTS.slice(0, 3),
        expect.stringContaining('london_chess_club_events_'),
      );
      expect(exportEventsToIcalSpy).toHaveBeenCalledWith(
        MOCK_EVENTS.slice(0, 3),
        expect.stringContaining('.ics'),
      );
    });

    it('should disable button when there are no events', () => {
      fixture.componentRef.setInput('filteredEvents', []);
      fixture.detectChanges();

      expect(
        query(
          fixture.debugElement,
          '.schedule-toolbar__export',
        ).componentInstance.disabled(),
      ).toBe(true);
    });

    it('should generate filename with current date', async () => {
      dateToISOStringSpy.mockReturnValue('2024-01-15T10:30:00.000Z');
      vi.spyOn(dialogService, 'open').mockResolvedValue('confirm');

      await component.onExportToIcal();

      expect(exportEventsToIcalSpy).toHaveBeenCalledTimes(1);
      expect(exportEventsToIcalSpy).toHaveBeenCalledWith(
        MOCK_EVENTS.slice(0, 3),
        'london_chess_club_events_2024-01-15.ics',
      );
    });

    it('should not export when dialog is cancelled', async () => {
      vi.spyOn(dialogService, 'open').mockResolvedValue('cancel');

      await component.onExportToIcal();

      expect(exportEventsToIcalSpy).not.toHaveBeenCalled();
    });
  });

  describe('onToday', () => {
    it('should scroll the row holding the today scroll point into view', () => {
      const row = document.createElement('tr');
      const point = row
        .appendChild(document.createElement('td'))
        .appendChild(document.createElement('div'));
      row.scrollIntoView = vi.fn();
      point.scrollIntoView = vi.fn();
      todayScrollPointSpy.mockReturnValue(point);

      component.onToday();

      expect(row.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
      expect(point.scrollIntoView).not.toHaveBeenCalled();
    });

    it('should scroll the today scroll point itself when it is not in a table', () => {
      const point = document.createElement('div');
      point.scrollIntoView = vi.fn();
      todayScrollPointSpy.mockReturnValue(point);

      component.onToday();

      expect(point.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    it('should do nothing when there is no today scroll point', () => {
      todayScrollPointSpy.mockReturnValue(null);

      expect(() => component.onToday()).not.toThrow();
    });

    it('should disable today button when today scroll point does not exist', () => {
      todayScrollPointSpy.mockReturnValue(null);

      // Force change detection to pick up the new mock value
      component.changeDetectorRef.detectChanges();

      expect(
        query(
          fixture.debugElement,
          '.schedule-toolbar__today',
        ).componentInstance.disabled(),
      ).toBe(true);
    });

    it('should enable today button when today scroll point exists', () => {
      const mockElement = { scrollIntoView: vi.fn() };
      todayScrollPointSpy.mockReturnValue(mockElement as unknown as Element);

      // Force change detection to pick up the new mock value
      component.changeDetectorRef.detectChanges();

      expect(
        query(
          fixture.debugElement,
          '.schedule-toolbar__today',
        ).componentInstance.disabled(),
      ).toBe(false);
    });
  });

  describe('toggleScheduleView output', () => {
    it('should emit toggleScheduleView event', () => {
      vi.spyOn(component.toggleScheduleView, 'emit');

      query(fixture.debugElement, '.schedule-toolbar__view').triggerEventHandler(
        'changed',
        true,
      );

      expect(component.toggleScheduleView.emit).toHaveBeenCalled();
    });
  });
});
