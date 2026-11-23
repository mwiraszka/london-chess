import { ButtonComponent, DialogService, PAGE_SIZE_ALL } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NEVER, of, throwError } from 'rxjs';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import {
  EventsApiService,
  MetaAndTitleService,
  StoreRequestService,
} from '@app/services';
import { EventsActions } from '@app/store/events';
import { NavActions } from '@app/store/nav';
import { closedDialogRef, lastOpenedDialog } from '@app/utils';

import { ScheduleEditorPageComponent } from './schedule-editor-page.component';

describe('ScheduleEditorPageComponent', () => {
  let fixture: ComponentFixture<ScheduleEditorPageComponent>;
  let component: ScheduleEditorPageComponent;

  let dialogOpenSpy: Mock;
  let dispatchSpy: MockInstance;
  let getFilteredEventsSpy: Mock;
  let storeRequestSpy: Mock;

  const [blitz, , lecture] = MOCK_EVENTS;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(ScheduleEditorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const panels = (): DebugElement[] =>
    fixture.debugElement.queryAll(By.css('ea-accordion-item'));

  const headings = (): string[] =>
    panels().map(panel =>
      panel.query(By.css('.schedule-editor__heading')).nativeElement.textContent.trim(),
    );

  function expand(index: number): void {
    panels()[index].query(By.css('.ea-accordion-item__trigger')).nativeElement.click();
    fixture.detectChanges();
  }

  const removeButton = (index: number): ButtonComponent =>
    panels()[index].query(By.css('.schedule-editor__remove')).componentInstance;

  function toggleRemoval(index: number): void {
    removeButton(index).clicked.emit(new MouseEvent('click'));
    fixture.detectChanges();
  }

  function typeInto(id: string, value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`[id="${id}"]`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  const summary = (): string =>
    fixture.nativeElement.querySelector('.schedule-editor__summary').textContent.trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleEditorPageComponent],
      providers: [
        provideRouter([]),
        provideMockStore(),
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        { provide: StoreRequestService, useValue: { dispatch: vi.fn() } },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
        {
          provide: EventsApiService,
          useValue: {
            getFilteredEvents: vi.fn(() =>
              of({ data: { items: [blitz, lecture], filteredCount: 2, totalCount: 2 } }),
            ),
          },
        },
      ],
    }).compileComponents();

    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    dispatchSpy = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    getFilteredEventsSpy = vi.mocked(TestBed.inject(EventsApiService).getFilteredEvents);
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
  });

  it('should list every upcoming event in a closed panel, with nothing to save yet', async () => {
    await render();

    expect(getFilteredEventsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: PAGE_SIZE_ALL,
        filters: { showPastEvents: expect.objectContaining({ value: false }) },
      }),
    );
    expect(headings()).toHaveLength(2);
    expect(headings()[0]).toContain(blitz.title);
    expect(fixture.nativeElement.querySelector('.schedule-editor__fields')).toBeNull();
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(summary()).toBe('');
  });

  it('should hold the place of the events with closed headers while they load', async () => {
    getFilteredEventsSpy.mockReturnValue(NEVER);

    await render();

    const placeholders = fixture.debugElement.queryAll(
      By.css('ea-accordion[aria-busy="true"] ea-accordion-item'),
    );
    const addButton: ButtonComponent = fixture.debugElement.query(
      By.css('.schedule-editor__add'),
    ).componentInstance;
    expect(placeholders).toHaveLength(6);
    expect(addButton.disabled()).toBe(true);
  });

  it('should offer to load the schedule again when it cannot be loaded', async () => {
    getFilteredEventsSpy.mockReturnValue(throwError(() => new Error('down')));

    await render();

    expect(fixture.nativeElement.querySelector('lcc-load-failed')).not.toBeNull();
  });

  it('should mark an event to remove, and keep it again', async () => {
    await render();
    expand(1);

    toggleRemoval(1);
    const removedHeading = headings()[1];
    const struck = panels()[1].queryAll(
      By.css('.schedule-editor__title--removed, .event-type--struck'),
    ).length;
    const keepVariant = removeButton(1).variant();
    toggleRemoval(1);

    expect(removedHeading).toContain('(to be removed)');
    expect(struck).toBe(2);
    expect(panels()[1].query(By.css('.event-type--struck'))).toBeNull();
    expect(keepVariant).toBe('secondary');
    expect(removeButton(1).variant()).toBe('danger');
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('should flag an event with errors on its header, even closed', async () => {
    await render();
    expand(0);

    typeInto(`${blitz.id}-title`, '');
    expand(0);

    expect(fixture.nativeElement.querySelector('.schedule-editor__fields')).toBeNull();
    expect(panels()[0].query(By.css('.schedule-editor__invalid-icon'))).not.toBeNull();
    expect(panels()[1].query(By.css('.schedule-editor__invalid-icon'))).toBeNull();
    expect(headings()[0]).toMatch(/\(has errors\)$/);
  });

  it('should open a new event first, and drop it when removed before saving', async () => {
    await render();

    component.onAdd();
    fixture.detectChanges();
    const addedHeading = headings()[0];
    const addedIcon = panels()[0].query(By.css('.ea-accordion-item__icon'));
    toggleRemoval(0);

    expect(addedHeading).toMatch(/^New event, [\s\S]*\(new, has errors\)$/);
    expect(addedIcon).not.toBeNull();
    expect(headings()).toHaveLength(2);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('should save a change, a removal and an addition together, then leave', async () => {
    await render();
    storeRequestSpy.mockResolvedValue(
      EventsActions.scheduleChangesSucceeded({
        added: [],
        updated: [],
        removedIds: [],
        unnotifiedMembers: [],
      }),
    );

    expand(0);
    expand(1);
    typeInto(`${blitz.id}-title`, 'Renamed blitz');
    toggleRemoval(1);
    component.onAdd();
    fixture.detectChanges();
    typeInto('new-1-title', 'Rapid night');
    typeInto('new-1-details', 'Twenty-five minute games');
    const pendingHeadings = headings();
    const changedTitles = fixture.debugElement
      .queryAll(By.css('.schedule-editor__title--changed'))
      .map(title => title.nativeElement.textContent.trim());
    const pending = summary();
    await component.onSave();
    await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

    expect(pendingHeadings).toEqual([
      expect.stringMatching(/^Rapid night, [\s\S]*\(new\)$/),
      expect.stringMatching(/^Renamed blitz, /),
      expect.stringMatching(/\(to be removed\)$/),
    ]);
    expect(changedTitles).toEqual([expect.stringMatching(/^Renamed blitz, /)]);
    expect(pending).toBe('1 event to add, 1 event to change, 1 event to remove.');
    expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
      'Save these 3 changes to the schedule? Members who get schedule emails are sent one email listing them all.',
    );
    expect(storeRequestSpy).toHaveBeenCalledWith(
      EventsActions.scheduleChangesRequested({
        added: [
          expect.objectContaining({
            title: 'Rapid night',
            details: 'Twenty-five minute games',
          }),
        ],
        updated: [expect.objectContaining({ id: blitz.id, title: 'Renamed blitz' })],
        removed: [lecture],
      }),
      [EventsActions.scheduleChangesSucceeded, EventsActions.scheduleChangesFailed],
    );
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      NavActions.navigationRequested({ path: 'schedule' }),
    );
  });

  it('should stay with the changes when they cannot be saved', async () => {
    await render();
    storeRequestSpy.mockResolvedValue(
      EventsActions.scheduleChangesFailed({ error: { name: 'LCCError', message: 'No' } }),
    );

    expand(0);
    toggleRemoval(0);
    await component.onSave();
    await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

    expect(component.hasUnsavedChanges()).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
