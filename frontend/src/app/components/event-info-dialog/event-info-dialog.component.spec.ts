import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { query } from '@app/utils';

import { EventInfoDialogComponent } from './event-info-dialog.component';

describe('EventInfoDialogComponent', () => {
  let fixture: ComponentFixture<EventInfoDialogComponent>;
  let component: EventInfoDialogComponent;

  let dialogResultSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventInfoDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventInfoDialogComponent);
    component = fixture.componentInstance;

    dialogResultSpy = vi.spyOn(component.dialogResult, 'emit');

    component.event = MOCK_EVENTS[4]; // Event with associated article
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('dialog result handling', () => {
    it('should emit "details" when details button is clicked', () => {
      query(fixture.debugElement, '.details-button').triggerEventHandler('click');

      expect(dialogResultSpy).toHaveBeenCalledWith('details');
    });

    it('should emit "details" when enter key is pressed', () => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      document.dispatchEvent(enterEvent);

      expect(dialogResultSpy).toHaveBeenCalledWith('details');
    });

    it('should not render "details" button for events with no associated article', () => {
      fixture.componentRef.setInput('event', MOCK_EVENTS[0]); // Event with no associated article
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.details-button')).toBeFalsy();
    });
  });
});
