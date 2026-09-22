import { OverlayModule } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminControlsConfig } from '@app/models';

import { AdminControlsService } from './admin-controls.service';
import { DialogService } from './dialog.service';

describe('AdminControlsService', () => {
  let service: AdminControlsService;
  let dialogService: { topDialogRef: DialogService['topDialogRef'] };

  const config: AdminControlsConfig = {
    buttonSize: 34,
    deleteCb: vi.fn(),
    editPath: ['event', 'edit'],
    itemName: 'Test Item',
  };

  const anchor = () => document.body.appendChild(document.createElement('div'));

  const controls = () =>
    document.querySelector('.cdk-overlay-container lcc-admin-controls');

  beforeEach(() => {
    dialogService = { topDialogRef: null };
    TestBed.configureTestingModule({
      imports: [OverlayModule],
      providers: [provideRouter([]), { provide: DialogService, useValue: dialogService }],
    });
    service = TestBed.inject(AdminControlsService);
  });

  afterEach(() => {
    service.close();
    vi.useRealTimers();
  });

  it('should show the controls for the item until they are closed', () => {
    service.open(config, anchor());

    expect(service.isOpen).toBe(true);
    expect(controls()).toBeTruthy();

    service.close();

    expect(service.isOpen).toBe(false);
    expect(controls()).toBeFalsy();
  });

  it("should show one item's controls at a time", () => {
    service.open(config, anchor());
    service.open({ ...config, itemName: 'Other' }, anchor());

    expect(
      document.querySelectorAll('.cdk-overlay-container lcc-admin-controls'),
    ).toHaveLength(1);
  });

  it('should close on a click anywhere, once the opening click has passed', () => {
    vi.useFakeTimers();
    service.open(config, anchor());
    document.body.click();
    expect(service.isOpen).toBe(true);

    vi.advanceTimersByTime(1);
    document.body.click();

    expect(service.isOpen).toBe(false);
  });

  it('should sit under the app header, or over an open dialog', () => {
    service.open(config, anchor());
    expect(
      (document.querySelector('.cdk-overlay-container') as HTMLElement).style.zIndex,
    ).toBe('900');

    dialogService.topDialogRef = {} as DialogService['topDialogRef'];
    service.open(config, anchor());

    expect(
      (document.querySelector('.cdk-overlay-container') as HTMLElement).style.zIndex,
    ).toBe('1100');
  });
});
