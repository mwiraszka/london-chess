import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { EVENT_FORM_DATA_PROPERTIES, INITIAL_EVENT_FORM_DATA } from '@app/constants';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { Event, EventFormData, Id } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import {
  EventsActions,
  EventsState,
  initialState as eventsInitialState,
} from '@app/store/events';
import { query } from '@app/utils';

import { EventEditorPageComponent } from './event-editor-page.component';

describe('EventEditorPageComponent', () => {
  let fixture: ComponentFixture<EventEditorPageComponent>;
  let component: EventEditorPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  let mockParamsSubject: BehaviorSubject<{ event_id?: Id }>;

  beforeEach(async () => {
    mockParamsSubject = new BehaviorSubject<{ event_id?: Id }>({});

    const mockEventsState: EventsState = {
      ...eventsInitialState,
      ids: MOCK_EVENTS.map(event => event.id),
      entities: MOCK_EVENTS.reduce(
        (acc, event) => {
          acc[event.id] = {
            event,
            formData: pick(event, EVENT_FORM_DATA_PROPERTIES),
          };
          return acc;
        },
        {} as Record<Id, { event: Event; formData: EventFormData }>,
      ),
    };

    await TestBed.configureTestingModule({
      imports: [EventEditorPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: mockParamsSubject.asObservable() },
        },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideMockStore({
          initialState: {
            eventsState: mockEventsState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventEditorPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    describe('with event_id route param', () => {
      beforeEach(() => {
        mockParamsSubject.next({ event_id: MOCK_EVENTS[0].id });
        component.ngOnInit();
      });

      it('should set viewModel$ based on event title', async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          formData: pick(MOCK_EVENTS[0], EVENT_FORM_DATA_PROPERTIES),
          hasUnsavedChanges: false,
          originalEvent: MOCK_EVENTS[0],
          pageHeading: `Edit ${MOCK_EVENTS[0].title}`,
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith(`Edit ${MOCK_EVENTS[0].title}`);
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          `Edit ${MOCK_EVENTS[0].title} for the London Chess Club.`,
        );
      });
    });

    describe('without event_id route param', () => {
      beforeEach(() => {
        component.ngOnInit();
      });

      it("should default viewModel$ to 'create' mode", async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          formData: INITIAL_EVENT_FORM_DATA,
          hasUnsavedChanges: false,
          originalEvent: null,
          pageHeading: 'Add an event',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith('Add an event');
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          'Add an event for the London Chess Club.',
        );
      });
    });
  });

  describe('onCancel', () => {
    it('should dispatch cancelSelected action', () => {
      component.onCancel();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(EventsActions.cancelSelected());
    });
  });

  describe('onChange', () => {
    it('should dispatch changeSelected action', () => {
      const mockEventId = 'abc123';
      const mockChangedFormData: Partial<EventFormData> = {
        title: 'A new title',
      };
      component.onChange(mockEventId, mockChangedFormData);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.formDataChanged({
          eventId: mockEventId,
          formData: mockChangedFormData,
        }),
      );
    });
  });

  describe('onRequestAddEvent', () => {
    it('should dispatch addEventRequested action', () => {
      component.onRequestAddEvent();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(EventsActions.addEventRequested());
    });
  });

  describe('onRequestUpdateEvent', () => {
    it('should dispatch updateEventRequested action', () => {
      const mockEventId = 'abc123abc123';
      component.onRequestUpdateEvent(mockEventId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.updateEventRequested({ eventId: mockEventId }),
      );
    });
  });

  describe('onRestore', () => {
    it('should dispatch formDataRestored action', () => {
      const mockEventId = 'abc123';
      component.onRestore(mockEventId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.formDataRestored({ eventId: mockEventId }),
      );
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-event-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-event-form')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });
  });
});
