import { DialogRef } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { query, queryTextContent } from '@app/utils';

import { EventInfoDialogComponent } from './event-info-dialog.component';

describe('EventInfoDialogComponent', () => {
  let fixture: ComponentFixture<EventInfoDialogComponent>;
  let closeSpy: MockInstance;

  const withArticle = MOCK_EVENTS[4];
  const withoutArticle = MOCK_EVENTS[0];

  const pressEnter = (target: Element): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  };

  function render(event = withArticle): void {
    fixture = TestBed.createComponent(EventInfoDialogComponent);
    fixture.componentRef.setInput('event', event);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    const dialogRef = new DialogRef<'details'>();
    closeSpy = vi.spyOn(dialogRef, 'close');

    await TestBed.configureTestingModule({
      imports: [EventInfoDialogComponent],
      providers: [{ provide: DialogRef, useValue: dialogRef }],
    }).compileComponents();

    render();
  });

  it('should show the event in an open dialog', () => {
    expect(queryTextContent(fixture.debugElement, '[slot="header"]')).toBe(
      withArticle.title,
    );
    expect(queryTextContent(fixture.debugElement, '.event-type')).toBe(withArticle.type);
    expect(query(fixture.debugElement, 'dialog').nativeElement.hasAttribute('open')).toBe(
      true,
    );
  });

  it('should break the details into paragraphs at every escaped line break', () => {
    fixture.destroy();

    render({ ...withArticle, details: 'Round one\\nRound two\\nRound three' });

    expect(query(fixture.debugElement, '.event-details').nativeElement.textContent).toBe(
      'Round one\n\nRound two\n\nRound three',
    );
  });

  it('should answer details from the details button', () => {
    query(fixture.debugElement, '.details-button').triggerEventHandler('clicked');

    expect(closeSpy).toHaveBeenCalledWith('details');
  });

  it('should answer details when Enter is pressed away from the buttons', () => {
    pressEnter(query(fixture.debugElement, '.dialog-body').nativeElement);

    expect(closeSpy).toHaveBeenCalledWith('details');
  });

  it('should close without an answer when the dialog is dismissed', () => {
    query(fixture.debugElement, '.ea-dialog__close').nativeElement.click();

    expect(closeSpy).toHaveBeenCalledWith();
  });

  describe('for an event without an article', () => {
    beforeEach(() => {
      fixture.destroy();
      render(withoutArticle);
    });

    it('should offer no details button', () => {
      expect(query(fixture.debugElement, '.details-button')).toBeFalsy();
    });

    it('should ignore Enter', () => {
      pressEnter(query(fixture.debugElement, '.dialog-body').nativeElement);

      expect(closeSpy).not.toHaveBeenCalled();
    });
  });
});
