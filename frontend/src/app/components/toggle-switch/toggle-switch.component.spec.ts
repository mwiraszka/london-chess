import { EyeIconComponent, EyeOffIconComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { query } from '@app/utils';

import { ToggleSwitchComponent } from './toggle-switch.component';

describe('ToggleSwitchComponent', () => {
  let fixture: ComponentFixture<ToggleSwitchComponent>;
  let component: ToggleSwitchComponent;

  let emitSpy: MockInstance;
  let tooltipAttachSpy: MockInstance;
  let tooltipDetachSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleSwitchComponent, TooltipDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleSwitchComponent);
    component = fixture.componentInstance;

    component.iconTooltipWhenOff = 'Mock tooltip';
    component.iconWhenOn = EyeIconComponent;
    component.iconWhenOff = EyeOffIconComponent;
    component.tooltipWhenOff = 'Tooltip when off';
    component.tooltipWhenOn = 'Tooltip when on';
    fixture.detectChanges();

    // Tooltip directive spies need to be set after first change detection cycle
    emitSpy = vi.spyOn(component.toggle, 'emit');
    // @ts-expect-error Private class member
    tooltipAttachSpy = vi.spyOn(component.tooltipDirective, 'attach');
    // @ts-expect-error Private class member
    tooltipDetachSpy = vi.spyOn(component.tooltipDirective, 'detach');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should generate a unique 8-char ID on initialization', () => {
      expect(component.uniqueId.length).toBe(8);
    });
  });

  describe('onToggleChange', () => {
    it('should correctly handle tooltip refresh', () => {
      vi.useFakeTimers();
      component.onToggleChange();
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(tooltipAttachSpy).not.toHaveBeenCalled();
      expect(tooltipDetachSpy).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();
      vi.advanceTimersByTime(1);

      expect(emitSpy).not.toHaveBeenCalled();
      expect(tooltipAttachSpy).toHaveBeenCalledTimes(1);
      expect(tooltipDetachSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    describe('when switched off', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('switchedOn', false);
        fixture.detectChanges();
      });

      it('should have unchecked input', () => {
        expect(
          query(fixture.debugElement, 'input[type="checkbox"]').nativeElement.checked,
        ).toBe(false);
      });

      it('should show iconWhenOff if icon is provided', () => {
        expect(query(fixture.debugElement, 'ea-icon-eye-off')).toBeTruthy();
      });

      it('should not display any icon if iconWhenOff is not provided', () => {
        fixture.componentRef.setInput('iconWhenOff', undefined);
        fixture.detectChanges();
        expect(query(fixture.debugElement, '.toggle-icon')).toBeFalsy();
      });

      it('should apply iconTooltipWhenOff to icon if tooltip is provided', () => {
        const tooltipDirective = query(fixture.debugElement, '.toggle-icon').injector.get(
          TooltipDirective,
        );
        expect(tooltipDirective.tooltip).toBe('Mock tooltip');
      });

      it('should not apply tooltip to icon if iconTooltipWhenOff is not provided', () => {
        fixture.componentRef.setInput('iconTooltipWhenOff', null);
        fixture.detectChanges();
        const iconEl = query(fixture.debugElement, '.toggle-icon');
        if (iconEl) {
          const tooltipDirective = iconEl.injector.get(TooltipDirective);
          expect(tooltipDirective.tooltip).toBeFalsy();
        }
      });

      it('should apply warning class when warningWhenOff is true', () => {
        fixture.componentRef.setInput('warningWhenOff', true);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.slider').classes['warning']).toBe(true);
      });

      it('should apply warning class when warningWhenOff is false', () => {
        expect(query(fixture.debugElement, '.slider').classes['warning']).toBeUndefined();
      });

      it('should emit toggle event when switched on', () => {
        query(fixture.debugElement, 'input[type="checkbox"]').nativeElement.click();
        fixture.detectChanges();

        expect(emitSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when switched on', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('switchedOn', true);
        fixture.detectChanges();
      });

      it('should have checked input', () => {
        expect(
          query(fixture.debugElement, 'input[type="checkbox"]').nativeElement.checked,
        ).toBe(true);
      });

      it('should show iconWhenOn if icon is provided', () => {
        fixture.componentRef.setInput('iconWhenOn', EyeIconComponent);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'ea-icon-eye')).toBeTruthy();
      });

      it('should not display any icon if iconWhenOn is not provided', () => {
        fixture.componentRef.setInput('iconWhenOn', undefined);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.toggle-icon')).toBeFalsy();
      });

      it('should not apply warning class when warningWhenOff is true', () => {
        fixture.componentRef.setInput('warningWhenOff', true);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.slider').classes['warning']).toBeUndefined();
      });

      it('should not apply warning class when warningWhenOff is false', () => {
        fixture.componentRef.setInput('warningWhenOff', false);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.slider').classes['warning']).toBeUndefined();
      });

      it('should emit toggle event when switched off', () => {
        query(fixture.debugElement, 'input[type="checkbox"]').nativeElement.click();
        fixture.detectChanges();

        expect(emitSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
