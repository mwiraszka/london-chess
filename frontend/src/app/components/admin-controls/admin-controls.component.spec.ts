import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { ADMIN_CONTROLS_CONFIG_TOKEN } from '@app/directives/admin-controls.directive';
import { AdminControlsConfig } from '@app/models/admin-controls-config.model';
import { KeyStateService } from '@app/services';
import { query } from '@app/utils';

import { AdminControlsComponent } from './admin-controls.component';

describe('AdminControlsComponent', () => {
  let fixture: ComponentFixture<AdminControlsComponent>;
  let component: AdminControlsComponent;

  let keyStateService: KeyStateService;

  let ctrlMetaKeyPressedSpy: MockInstance;
  let deleteCbSpy: MockInstance;
  let destroyedSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlsComponent, RouterModule.forRoot([])],
      providers: [
        {
          provide: ADMIN_CONTROLS_CONFIG_TOKEN,
          useValue: {
            buttonSize: 15,
            deleteCb: vi.fn(),
            isDeleteDisabled: false,
          },
        },
        KeyStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminControlsComponent);
    component = fixture.componentInstance;

    keyStateService = TestBed.inject(KeyStateService);

    ctrlMetaKeyPressedSpy = vi.spyOn(keyStateService, 'ctrlMetaKeyPressed$', 'get');
    deleteCbSpy = vi.spyOn(component.config, 'deleteCb');
    destroyedSpy = vi.spyOn(component.destroyed, 'emit');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('destroyed event emitter', () => {
    it('should emit destroyed event on ngOnDestroy', () => {
      expect(destroyedSpy).toHaveBeenCalledTimes(0);
      component.ngOnDestroy();

      expect(destroyedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    describe('bookmark button', () => {
      it('should not render if only bookmarkCb is provided', () => {
        component.config.bookmarkCb = vi.fn();
        component.config.bookmarked = undefined;
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.bookmark-button')).toBeFalsy();
      });

      it('should not render if only bookmarked is provided', () => {
        component.config.bookmarkCb = undefined;
        component.config.bookmarked = false;
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.bookmark-button')).toBeFalsy();
      });

      it('should render if both bookmarkCb and bookmarked are provided', () => {
        component.config.bookmarkCb = vi.fn();
        component.config.bookmarked = false;
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.bookmark-button')).toBeTruthy();
      });

      it('should invoke bookmarkCb when clicked', () => {
        component.config.bookmarkCb = vi.fn();
        component.config.bookmarked = false;
        fixture.detectChanges();

        // Must redeclare spy after callback change
        const bookmarkCbSpy = vi.spyOn(component.config, 'bookmarkCb');

        query(fixture.debugElement, '.bookmark-button').triggerEventHandler('click');

        expect(bookmarkCbSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('edit button', () => {
      it('should not render if editPath is not provided', () => {
        component.config.editPath = undefined;
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.edit-button')).toBeFalsy();
      });

      it('should render if editPath is provided', () => {
        component.config.editPath = ['event', 'edit'];
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.edit-button')).toBeTruthy();
      });
    });

    describe('delete button', () => {
      describe('on touch devices', () => {
        beforeEach(() => {
          component.isTouchDevice = true;
        });

        it('should render disabled when isDeleteDisabled is true', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: true,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          expect(
            query(fixture.debugElement, '.delete-button').nativeElement.disabled,
          ).toBe(true);
        });

        it('should not invoke deleteCb when clicked when isDeleteDisabled is true', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: true,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          query(fixture.debugElement, '.delete-button').triggerEventHandler('click');

          expect(deleteCbSpy).not.toHaveBeenCalled();
        });

        it('should render enabled when isDeleteDisabled is false', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: false,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          expect(
            query(fixture.debugElement, '.delete-button').nativeElement.disabled,
          ).toBe(false);
        });

        it('should invoke deleteCb when clicked when isDeleteDisabled is false', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: false,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          query(fixture.debugElement, '.delete-button').triggerEventHandler('click');

          expect(deleteCbSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('on non-touch devices when ctrlMeta button is pressed', () => {
        beforeEach(() => {
          ctrlMetaKeyPressedSpy.mockReturnValue(of(true));
          component.isTouchDevice = false;
        });

        it('should render disabled when isDeleteDisabled is true', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: true,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          expect(
            query(fixture.debugElement, '.delete-button').nativeElement.disabled,
          ).toBe(true);
        });

        it('should not invoke deleteCb when clicked when isDeleteDisabled is true', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: true,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          query(fixture.debugElement, '.delete-button').triggerEventHandler('click');

          expect(deleteCbSpy).not.toHaveBeenCalled();
        });

        it('should render enabled when isDeleteDisabled is false', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: false,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          expect(
            query(fixture.debugElement, '.delete-button').nativeElement.disabled,
          ).toBe(false);
        });

        it('should invoke deleteCb when clicked when isDeleteDisabled is false', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: false,
          } as AdminControlsConfig;
          component.ngOnInit();
          fixture.detectChanges();

          query(fixture.debugElement, '.delete-button').triggerEventHandler('click');

          expect(deleteCbSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('on non-touch devices without pressed ctrlMeta button', () => {
        beforeEach(() => {
          ctrlMetaKeyPressedSpy.mockReturnValue(of(false));
          component.isTouchDevice = false;
          fixture.detectChanges();

          component.ngOnInit();
        });

        it('should not render when isDeleteDisabled is true', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: true,
          } as AdminControlsConfig;
          fixture.detectChanges();

          expect(query(fixture.debugElement, '.delete-button')).toBeFalsy();
        });

        it('should not render when isDeleteDisabled is false', () => {
          component.config = {
            ...component.config,
            isDeleteDisabled: false,
          } as AdminControlsConfig;
          fixture.detectChanges();

          expect(query(fixture.debugElement, '.delete-button')).toBeFalsy();
        });
      });
    });
  });
});
