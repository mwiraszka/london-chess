import { TagComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventType } from '@app/models';
import { query } from '@app/utils';

import { EventTypeTagComponent } from './event-type-tag.component';

describe('EventTypeTagComponent', () => {
  let fixture: ComponentFixture<EventTypeTagComponent>;

  const tag = (): TagComponent => query(fixture.debugElement, 'ea-tag').componentInstance;

  const render = (type: EventType, search = ''): void => {
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('search', search);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventTypeTagComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventTypeTagComponent);
  });

  it('should colour the tag for its event type, in the schedule ink', () => {
    render('lecture');

    expect(tag().color()).toBe('var(--lcc-event-lecture-faint)');
    expect(tag().ink()).toBe('var(--color-text-primary)');
    expect(fixture.nativeElement.textContent.trim()).toBe('lecture');
  });

  it('should add a trophy only to a championship', () => {
    render('simul');
    const simulTrophy = query(fixture.debugElement, '.championship-icon');

    render('championship');

    expect(simulTrophy).toBeFalsy();
    expect(query(fixture.debugElement, '.championship-icon')).toBeTruthy();
  });

  it('should highlight what was searched for', () => {
    render('championship', 'champ');

    expect(query(fixture.debugElement, 'mark').nativeElement.textContent).toBe('champ');
  });
});
