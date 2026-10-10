import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { IS_MAC } from '@app/tokens';

import { KeyStateService } from './key-state.service';

describe('KeyStateService', () => {
  let service: KeyStateService;

  let isMacSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KeyStateService, { provide: IS_MAC, useValue: vi.fn() }],
    });

    service = TestBed.inject(KeyStateService);

    isMacSpy = TestBed.inject(IS_MAC) as Mock;
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('ctrlMetaKeyPressed$', () => {
    it('should emit false initially', async () => {
      const pressed = await firstValueFrom(service.ctrlMetaKeyPressed$);

      expect(pressed).toBe(false);
    });

    it('should emit true when Control key pressed on non-Mac', () => {
      isMacSpy.mockReturnValue(false);
      const emissions: boolean[] = [];
      service.ctrlMetaKeyPressed$.subscribe(pressed => emissions.push(pressed));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));

      expect(emissions).toEqual([false, true]);
    });

    it('should emit false when Control key released on non-Mac', () => {
      isMacSpy.mockReturnValue(false);
      const emissions: boolean[] = [];
      service.ctrlMetaKeyPressed$.subscribe(pressed => emissions.push(pressed));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));

      expect(emissions).toEqual([false, true, false]);
    });

    it('should emit true when Meta key pressed on Mac', () => {
      isMacSpy.mockReturnValue(true);
      const emissions: boolean[] = [];
      service.ctrlMetaKeyPressed$.subscribe(pressed => emissions.push(pressed));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));

      expect(emissions).toEqual([false, true]);
    });

    it('should emit false when Meta key released on Mac', () => {
      isMacSpy.mockReturnValue(true);
      const emissions: boolean[] = [];
      service.ctrlMetaKeyPressed$.subscribe(pressed => emissions.push(pressed));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

      expect(emissions).toEqual([false, true, false]);
    });

    it('should not emit for Meta key on non-Mac', () => {
      isMacSpy.mockReturnValue(false);

      const emissions: boolean[] = [];

      service.ctrlMetaKeyPressed$.subscribe(pressed => {
        emissions.push(pressed);
      });

      const event = new KeyboardEvent('keydown', { key: 'Meta' });
      document.dispatchEvent(event);

      expect(emissions).toEqual([false]);
    });

    it('should not emit for Control key on Mac', () => {
      isMacSpy.mockReturnValue(true);

      const emissions: boolean[] = [];

      service.ctrlMetaKeyPressed$.subscribe(pressed => {
        emissions.push(pressed);
      });

      const event = new KeyboardEvent('keydown', { key: 'Control' });
      document.dispatchEvent(event);

      expect(emissions).toEqual([false]);
    });

    it('should ignore other keys', () => {
      isMacSpy.mockReturnValue(false);

      const emissions: boolean[] = [];

      service.ctrlMetaKeyPressed$.subscribe(pressed => {
        emissions.push(pressed);
      });

      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);

      expect(emissions).toEqual([false]);
    });
  });
});
