import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { query, queryTextContent } from '@app/utils';

import { ExpansionPanelComponent } from './expansion-panel.component';

describe('ExpansionPanelComponent', () => {
  let fixture: ComponentFixture<ExpansionPanelComponent>;
  let component: ExpansionPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpansionPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpansionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be collapsed by default', () => {
    expect(component.expanded).toBe(false);
    expect(fixture.debugElement.query(By.css('.expansion-content'))).toBeNull();
    expect(query(fixture.debugElement, 'ea-icon-chevron-down')).toBeTruthy();
  });

  it('should be expanded when [expanded] input is true', () => {
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.expansion-content'))).toBeTruthy();
    expect(query(fixture.debugElement, 'ea-icon-chevron-up')).toBeTruthy();
  });

  it('should toggle expansion when header is clicked', () => {
    const header = query(fixture.debugElement, '.expansion-header');

    header.triggerEventHandler('click');
    fixture.detectChanges();

    expect(component.expanded).toBe(true);
    expect(fixture.debugElement.query(By.css('.expansion-content'))).toBeTruthy();
    expect(query(fixture.debugElement, 'ea-icon-chevron-up')).toBeTruthy();

    header.triggerEventHandler('click');
    fixture.detectChanges();

    expect(component.expanded).toBe(false);
    expect(fixture.debugElement.query(By.css('.expansion-content'))).toBeNull();
    expect(query(fixture.debugElement, 'ea-icon-chevron-down')).toBeTruthy();
  });

  it('should render the heading when provided', () => {
    const testHeading = 'Test Expansion Heading';
    fixture.componentRef.setInput('heading', testHeading);
    fixture.detectChanges();

    expect(queryTextContent(fixture.debugElement, 'h4')).toBe(testHeading);
  });

  it('should not render h4 if heading is not provided', () => {
    component.heading = undefined;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('h4'))).toBeNull();
  });
});
