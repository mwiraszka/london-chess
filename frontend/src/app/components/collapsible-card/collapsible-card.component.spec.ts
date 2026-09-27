import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryTextContent } from '@app/utils';

import { CollapsibleCardComponent } from './collapsible-card.component';

@Component({
  imports: [CollapsibleCardComponent],
  template: `
    <lcc-collapsible-card heading="Openings">
      <p class="projected">Card content</p>
    </lcc-collapsible-card>
  `,
})
class HostComponent {}

describe('CollapsibleCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const toggle = () => query(fixture.debugElement, '.collapsible-card__toggle');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should show its heading and content, expanded by default', () => {
    expect(queryTextContent(fixture.debugElement, '.collapsible-card__heading')).toBe(
      'Openings',
    );
    expect(query(fixture.debugElement, '.projected')).toBeTruthy();
    expect(toggle().attributes['aria-expanded']).toBe('true');
  });

  it('should collapse and expand from anywhere on its header', () => {
    query(fixture.debugElement, '.collapsible-card__header').nativeElement.click();
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.projected')).toBeFalsy();
    expect(toggle().attributes['aria-expanded']).toBe('false');

    toggle().nativeElement.click();
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.projected')).toBeTruthy();
  });

  it('should tie its toggle to the content it controls', () => {
    const body = query(fixture.debugElement, '.collapsible-card__body');

    expect(toggle().attributes['aria-controls']).toBe(body.attributes['id']);
  });
});
