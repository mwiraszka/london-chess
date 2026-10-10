import { BehaviorSubject } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminControlsConfig } from '@app/models/admin-controls-config.model';
import { KeyStateService } from '@app/services';
import { IS_TOUCH_DEVICE } from '@app/tokens';
import { query } from '@app/utils';

import { AdminControlsComponent } from './admin-controls.component';

describe('AdminControlsComponent', () => {
  let fixture: ComponentFixture<AdminControlsComponent>;
  let config: AdminControlsConfig;
  let ctrlMetaKeyPressed$: BehaviorSubject<boolean>;
  let touchDevice: boolean;

  const create = (overrides: Partial<AdminControlsConfig> = {}, touch = false): void => {
    config = { ...config, ...overrides };
    touchDevice = touch;
    fixture = TestBed.createComponent(AdminControlsComponent);
    fixture.componentRef.setInput('anchor', document.createElement('div'));
    fixture.componentRef.setInput('config', config);
    fixture.detectChanges();
  };

  const tooltipText = (selector: string): string => {
    const trigger: HTMLElement = query(fixture.debugElement, selector).nativeElement;
    trigger.dispatchEvent(new FocusEvent('focusin'));
    const text = document.body.querySelector('.ea-tooltip')?.textContent?.trim() ?? '';
    trigger.dispatchEvent(new FocusEvent('focusout'));
    return text;
  };

  const press = (selector: string): void => {
    query(fixture.debugElement, `${selector} button`).nativeElement.click();
  };

  beforeEach(async () => {
    config = { buttonSize: 15, deleteCb: vi.fn(), itemName: 'Spring Open' };
    ctrlMetaKeyPressed$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [AdminControlsComponent],
      providers: [
        provideRouter([]),
        { provide: KeyStateService, useValue: { ctrlMetaKeyPressed$ } },
        { provide: IS_TOUCH_DEVICE, useValue: () => touchDevice },
      ],
    }).compileComponents();
  });

  it('should size its buttons from the config', () => {
    create();

    expect(
      query(fixture.debugElement, '.admin-controls').nativeElement.style.getPropertyValue(
        '--button-size',
      ),
    ).toBe('15px');
  });

  it('should sit over the top start corner of the item, or centred on its start edge', () => {
    create();
    const popover = () => query(fixture.debugElement, 'ea-popover').componentInstance;
    const atTop = popover().placement();

    fixture.componentRef.setInput('placement', 'center');
    fixture.detectChanges();

    expect(atTop).toBe('inside-top-start');
    expect(popover().placement()).toBe('inside-start');
    expect(popover().contextMenu()).toBe(true);
  });

  it('should close once a control is used, or when the popover asks to', () => {
    create({ bookmarkCb: vi.fn(), bookmarked: false });
    const closedSpy = vi.spyOn(fixture.componentInstance.closed, 'emit');

    press('.bookmark-button');
    query(fixture.debugElement, 'ea-popover').triggerEventHandler('closeRequested');

    expect(closedSpy).toHaveBeenCalledTimes(2);
  });

  describe('bookmark button', () => {
    it('should need both a callback and a bookmarked state', () => {
      create({ bookmarkCb: vi.fn() });
      const withoutState = query(fixture.debugElement, '.bookmark-button');
      create({ bookmarkCb: undefined, bookmarked: false });
      const withoutCallback = query(fixture.debugElement, '.bookmark-button');

      expect(withoutState).toBeNull();
      expect(withoutCallback).toBeNull();
    });

    it('should bookmark the item when clicked', () => {
      const bookmarkCb = vi.fn();
      create({ bookmarkCb, bookmarked: false });

      press('.bookmark-button');

      expect(bookmarkCb).toHaveBeenCalledTimes(1);
    });

    it('should describe adding or removing the bookmark', () => {
      create({ bookmarkCb: vi.fn(), bookmarked: false });
      const toAdd = tooltipText('.bookmark-button');
      fixture.componentRef.setInput('config', { ...config, bookmarked: true });
      fixture.detectChanges();

      const toRemove = tooltipText('.bookmark-button');

      expect(toAdd).not.toBe(toRemove);
      expect(toRemove).toContain('Spring Open');
    });
  });

  describe('edit button', () => {
    it('should not render without an edit path', () => {
      create();

      expect(query(fixture.debugElement, '.edit-button')).toBeNull();
    });

    it('should link to the edit path in the same tab by default', () => {
      create({ editPath: ['event', 'edit', '1'] });

      const link: HTMLAnchorElement = query(
        fixture.debugElement,
        '.edit-button',
      ).nativeElement;
      expect(link.getAttribute('href')).toBe('/event/edit/1');
      expect(link.getAttribute('target')).toBeNull();
      expect(tooltipText('.edit-button')).toContain('Spring Open');
    });

    it('should open the edit path in a new tab when configured to', () => {
      create({ editPath: ['event', 'edit', '1'], editInNewTab: true });

      const link: HTMLAnchorElement = query(
        fixture.debugElement,
        '.edit-button',
      ).nativeElement;
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should not link anywhere while editing is disabled, and say why', () => {
      create({
        editPath: ['event', 'edit', '1'],
        isEditDisabled: true,
        editDisabledReason: 'Locked for review',
      });

      const link = query(fixture.debugElement, '.edit-button');
      expect(link.classes['disabled']).toBe(true);
      expect(link.nativeElement.getAttribute('href')).toBeNull();
      expect(tooltipText('.edit-button')).toBe('Locked for review');
    });
  });

  describe('delete button', () => {
    it('should always show on a touch device', () => {
      create({}, true);

      expect(query(fixture.debugElement, '.delete-button')).not.toBeNull();
    });

    it('should show only while ctrl or meta is held on other devices', () => {
      create();
      const hidden = query(fixture.debugElement, '.delete-button');

      ctrlMetaKeyPressed$.next(true);
      fixture.detectChanges();

      expect(hidden).toBeNull();
      expect(query(fixture.debugElement, '.delete-button')).not.toBeNull();
    });

    it('should delete the item when clicked', () => {
      create({}, true);

      press('.delete-button');

      expect(config.deleteCb).toHaveBeenCalledTimes(1);
      expect(tooltipText('.delete-button')).toContain('Spring Open');
    });

    it('should be disabled, say why, and not delete while deleting is disabled', () => {
      create(
        { isDeleteDisabled: true, deleteDisabledReason: 'Used in an article' },
        true,
      );

      const button: HTMLButtonElement = query(
        fixture.debugElement,
        '.delete-button button',
      ).nativeElement;
      button.click();

      expect(button.disabled).toBe(true);
      expect(config.deleteCb).not.toHaveBeenCalled();
      expect(tooltipText('.delete-button')).toBe('Used in an article');
    });
  });
});
