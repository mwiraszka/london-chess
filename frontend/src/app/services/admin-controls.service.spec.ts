import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminControlsConfig } from '@app/models';

import { AdminControlsService } from './admin-controls.service';

describe('AdminControlsService', () => {
  let service: AdminControlsService;

  const config: AdminControlsConfig = {
    buttonSize: 34,
    deleteCb: vi.fn(),
    editPath: ['event', 'edit'],
    itemName: 'Test Item',
  };

  const anchor = () => document.body.appendChild(document.createElement('div'));

  const controls = () => document.querySelectorAll('lcc-admin-controls');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(AdminControlsService);
  });

  afterEach(() => {
    service.close();
  });

  it('should show the controls for the item until they are closed', () => {
    service.open(config, anchor());
    const shown = controls().length;

    service.close();

    expect(shown).toBe(1);
    expect(service.isOpen).toBe(false);
    expect(controls()).toHaveLength(0);
  });

  it("should show one item's controls at a time", () => {
    service.open(config, anchor());

    service.open({ ...config, itemName: 'Other' }, anchor());

    expect(controls()).toHaveLength(1);
    expect(service.isOpen).toBe(true);
  });

  it('should close once the controls are done with', () => {
    service.open(config, anchor());
    TestBed.tick();

    document.querySelector<HTMLElement>('.admin-controls')?.click();

    expect(service.isOpen).toBe(false);
    expect(controls()).toHaveLength(0);
  });
});
