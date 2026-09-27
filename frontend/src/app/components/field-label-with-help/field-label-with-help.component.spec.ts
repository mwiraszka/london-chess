import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LichessLogoComponent } from '@app/components/platform-logos/lichess-logo.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { query, queryAll } from '@app/utils';

import { FieldLabelWithHelpComponent } from './field-label-with-help.component';

describe('FieldLabelWithHelpComponent', () => {
  let fixture: ComponentFixture<FieldLabelWithHelpComponent>;

  const render = (inputs: Partial<Record<'text' | 'forId' | 'icon', unknown>>): void => {
    fixture.componentRef.setInput('helpTooltip', 'Optional.');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  };

  const label = (): HTMLLabelElement =>
    query(fixture.debugElement, 'label').nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldLabelWithHelpComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldLabelWithHelpComponent);
  });

  it('should keep the last word together with the help icon', () => {
    render({ text: '  Chess.com   account name ' });

    const tail = query(fixture.debugElement, '.field-label__tail');
    expect(label().textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Chess.com account name',
    );
    expect(tail.nativeElement.textContent.trim()).toBe('name');
    expect(
      query(tail, '.field-label__help').injector.get(TooltipDirective).tooltip(),
    ).toBe('Optional.');
  });

  it('should put a single word label entirely beside the help icon', () => {
    render({ text: 'Phone' });

    const spans = queryAll(fixture.debugElement, 'label > span');
    expect(spans[0].nativeElement.textContent).toBe('');
    expect(spans[1].nativeElement.textContent.trim()).toBe('Phone');
  });

  it('should link the label to its field and show a leading icon', () => {
    render({
      text: 'Lichess username',
      forId: 'lichess-input',
      icon: LichessLogoComponent,
    });

    expect(label().getAttribute('for')).toBe('lichess-input');
    expect(
      query(fixture.debugElement, '.field-label__icon lcc-lichess-logo'),
    ).toBeTruthy();
  });

  it('should render no leading icon or for attribute by default', () => {
    render({ text: 'Lichess username' });

    expect(label().hasAttribute('for')).toBe(false);
    expect(query(fixture.debugElement, '.field-label__icon')).toBeFalsy();
  });
});
