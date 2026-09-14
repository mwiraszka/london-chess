import { ComponentFixture, TestBed } from '@angular/core/testing';

import { queryAll } from '@app/utils';

import { TechRingComponent } from './tech-ring.component';

describe('TechRingComponent', () => {
  let fixture: ComponentFixture<TechRingComponent>;

  const icons = () => queryAll(fixture.debugElement, '.tech');

  const hover = (index: number) => {
    icons()[index].triggerEventHandler('mouseenter', {});
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechRingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TechRingComponent);
    fixture.detectChanges();
  });

  it('should render every technology', () => {
    expect(icons().length).toBe(14);
  });

  it('should taper the lift over the two icons either side', () => {
    hover(5);

    expect(icons()[5].classes['tech--active']).toBe(true);
    expect(icons()[4].classes['tech--neighbour']).toBe(true);
    expect(icons()[6].classes['tech--neighbour']).toBe(true);
    expect(icons()[3].classes['tech--outer-neighbour']).toBe(true);
    expect(icons()[7].classes['tech--outer-neighbour']).toBe(true);
    expect(icons()[2].classes['tech--outer-neighbour']).toBeFalsy();
    expect(icons()[8].classes['tech--outer-neighbour']).toBeFalsy();
  });

  it('should measure the lift around the ring rather than along the list', () => {
    hover(0);

    expect(icons()[13].classes['tech--neighbour']).toBe(true);
    expect(icons()[1].classes['tech--neighbour']).toBe(true);
    expect(icons()[12].classes['tech--outer-neighbour']).toBe(true);
    expect(icons()[2].classes['tech--outer-neighbour']).toBe(true);
  });

  it('should drop the enlargement when the pointer leaves', () => {
    hover(3);

    icons()[3].triggerEventHandler('mouseleave', {});
    fixture.detectChanges();

    expect(icons().every(icon => !icon.classes['tech--active'])).toBe(true);
  });

  it('should name the active tool and keep every entry laid out', () => {
    const entries = () => queryAll(fixture.debugElement, '.tech-info__entry');

    hover(3);

    expect(entries().length).toBe(14);
    expect(
      entries().filter(entry => entry.classes['tech-info__entry--visible']).length,
    ).toBe(1);
  });

  it('should name the tapped tool on a device without hover', () => {
    icons()[5].triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(icons()[5].classes['tech--active']).toBe(true);
  });
});
