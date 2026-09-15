import { OverlayModule } from '@angular/cdk/overlay';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DialogOutput } from '@app/models';

import { DialogService } from './dialog.service';

@Component({
  selector: 'lcc-test-dialog',
  template: '<div>Test Dialog</div>',
  standalone: true,
})
class TestDialogComponent implements DialogOutput<string> {
  @Output() dialogResult = new EventEmitter<string | 'close'>();

  emitResult(value: string): void {
    this.dialogResult.emit(value);
  }
}

@Component({
  selector: 'lcc-another-dialog',
  template: '<div>Another Dialog</div>',
  standalone: true,
})
class AnotherDialogComponent implements DialogOutput<number> {
  @Input() numberInput?: number;
  @Output() dialogResult = new EventEmitter<number | 'close'>();

  emitResult(value: number): void {
    this.dialogResult.emit((this.numberInput ?? 0) + value);
  }
}

// Flush both the queued macrotask (initEventListeners setTimeout) and the
// microtask that runs the firstValueFrom().finally() disposal.
const flush = (): Promise<void> => new Promise<void>(resolve => setTimeout(resolve));

describe('DialogService', () => {
  let service: DialogService;

  let overlayCreateSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayModule],
      providers: [DialogService],
    });

    service = TestBed.inject(DialogService);

    overlayCreateSpy = vi.spyOn(service['overlay'], 'create');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('open', () => {
    it('should create overlay with correct configuration for modal dialog', () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      expect(overlayCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hasBackdrop: true,
          backdropClass: 'lcc-modal-backdrop',
        }),
      );
    });

    it('should create overlay with correct configuration for non-modal dialog', () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: false,
        inputs: {},
      });

      expect(overlayCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hasBackdrop: false,
        }),
      );
    });

    it('should set overlay container z-index', () => {
      const overlayContainer = document.createElement('div');
      overlayContainer.classList.add('cdk-overlay-container');
      document.body.appendChild(overlayContainer);

      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      expect(overlayContainer.style.zIndex).toBe('1100');

      document.body.removeChild(overlayContainer);
    });

    it('should prevent stacking same-type dialogs', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      const secondDialog = service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      const result = await secondDialog;

      expect(result).toBe('close');
      expect(service['dialogComponentRefs'].length).toBe(1);
    });

    it('should allow stacking different-type dialogs', () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: { numberInput: 5 },
      });

      expect(service['dialogComponentRefs'].length).toBe(2);
    });

    it('should create dialog component reference', async () => {
      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: { numberInput: 15 },
      });

      await flush();

      const componentRef = service['dialogComponentRefs'][0];
      expect(componentRef).toBeTruthy();
      expect(componentRef.instance).toBeTruthy();
    });

    it('should resolve when dialog emits result', async () => {
      const dialogPromise = service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      const componentRef = service['dialogComponentRefs'][0];
      componentRef.instance.result.emit('test-result');

      const result = await dialogPromise;

      expect(result).toBe('test-result');
    });

    it('should dispose overlay when dialog closes', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const overlayRef = service['overlayRefs'][0];
      const disposeSpy = vi.spyOn(overlayRef, 'dispose');

      const componentRef = service['dialogComponentRefs'][0];
      componentRef.instance.result.emit('close');

      await flush();

      expect(disposeSpy).toHaveBeenCalled();
      expect(service['dialogComponentRefs'].length).toBe(0);
      expect(service['overlayRefs'].length).toBe(0);
    });

    it('should initialize event listeners on first dialog open', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      expect(service['documentClickListener']).toBeDefined();
      expect(service['keydownListener']).toBeDefined();
    });

    it('should reuse event listeners for subsequent dialogs', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const firstDocumentListener = service['documentClickListener'];
      const firstKeydownListener = service['keydownListener'];

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: { numberInput: 5 },
      });

      await flush();

      expect(service['documentClickListener']).toBe(firstDocumentListener);
      expect(service['keydownListener']).toBe(firstKeydownListener);
    });
  });

  describe('closeAll', () => {
    it('should close all open dialogs', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: { numberInput: 20 },
      });

      await flush();

      expect(service['dialogComponentRefs'].length).toBe(2);
      expect(service['overlayRefs'].length).toBe(2);

      service.closeAll();

      expect(service['dialogComponentRefs'].length).toBe(0);
      expect(service['overlayRefs'].length).toBe(0);
    });

    it('should dispose all overlays', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: { numberInput: 5 },
      });

      await flush();

      const overlayRef1 = service['overlayRefs'][0];
      const overlayRef2 = service['overlayRefs'][1];

      const disposeSpy1 = vi.spyOn(overlayRef1, 'dispose');
      const disposeSpy2 = vi.spyOn(overlayRef2, 'dispose');

      service.closeAll();

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });

    it('should allow new dialogs to be opened after closing all', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      service.closeAll();

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      expect(service['dialogComponentRefs'].length).toBe(1);
      expect(service['overlayRefs'].length).toBe(1);
    });
  });

  describe('event listeners', () => {
    it('should initialize listeners when first dialog opens', async () => {
      expect(service['documentClickListener']).toBeUndefined();
      expect(service['keydownListener']).toBeUndefined();

      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      expect(service['documentClickListener']).toBeDefined();
      expect(service['keydownListener']).toBeDefined();
    });

    it('should close dialog when result emits close', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      expect(service['dialogComponentRefs'].length).toBe(1);

      const componentRef = service['dialogComponentRefs'][0];
      componentRef.instance.result.emit('close');

      await flush();

      expect(service['dialogComponentRefs'].length).toBe(0);
    });

    it('should close only top dialog when multiple open', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      expect(service['dialogComponentRefs'].length).toBe(2);

      const topComponentRef = service['dialogComponentRefs'][1];
      topComponentRef.instance.result.emit('close');

      await flush();

      expect(service['dialogComponentRefs'].length).toBe(1);
    });

    it('should remove event listeners when last dialog closes', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const documentListener = service['documentClickListener'];
      const keydownListener = service['keydownListener'];

      expect(documentListener).toBeDefined();
      expect(keydownListener).toBeDefined();

      const componentRef = service['dialogComponentRefs'][0];
      componentRef.instance.result.emit('close');

      await flush();

      expect(service['documentClickListener']).toBeDefined();
      expect(service['keydownListener']).toBeDefined();
      expect(service['overlayRefs'].length).toBe(0);
    });

    it('should not remove event listeners when dialogs remain open', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const componentRef = service['dialogComponentRefs'][1];
      componentRef.instance.result.emit('close');

      await flush();

      expect(service['documentClickListener']).toBeDefined();
      expect(service['keydownListener']).toBeDefined();
      expect(service['overlayRefs'].length).toBe(1);
    });
  });

  describe('topDialogRef', () => {
    it('should return null when no dialogs are open', () => {
      expect(service.topDialogRef).toBeNull();
    });

    it('should return top dialog component ref', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const topDialog = service.topDialogRef;

      expect(topDialog).toBeTruthy();
      expect(topDialog?.instance).toBeTruthy();
    });

    it('should return most recently opened dialog', async () => {
      service.open<TestDialogComponent, string>({
        componentType: TestDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const firstDialog = service.topDialogRef;

      service.open<AnotherDialogComponent, number>({
        componentType: AnotherDialogComponent,
        isModal: true,
        inputs: {},
      });

      await flush();

      const topDialog = service.topDialogRef;

      expect(topDialog).toBeTruthy();
      expect(topDialog).not.toBe(firstDialog);
      expect(service['dialogComponentRefs'].length).toBe(2);
    });
  });
});
