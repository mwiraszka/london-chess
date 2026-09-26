import { OverlayModule } from '@angular/cdk/overlay';
import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DialogConfig, DialogOutput } from '@app/models';

import { DialogService } from './dialog.service';

@Component({
  selector: 'lcc-test-dialog',
  template: '<div>Test Dialog</div>',
})
class TestDialogComponent implements DialogOutput<string> {
  readonly dialogResult = output<string | 'close'>();
}

@Component({
  selector: 'lcc-another-dialog',
  template: '<div>Another Dialog</div>',
})
class AnotherDialogComponent implements DialogOutput<number> {
  readonly numberInput = input<number>();
  readonly dialogResult = output<number | 'close'>();
}

const testDialogConfig: DialogConfig<TestDialogComponent> = {
  componentType: TestDialogComponent,
  isModal: true,
  inputs: {},
};

const anotherDialogConfig: DialogConfig<AnotherDialogComponent> = {
  componentType: AnotherDialogComponent,
  isModal: true,
  inputs: { numberInput: 5 },
};

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      imports: [OverlayModule],
    });

    service = TestBed.inject(DialogService);
  });

  afterEach(() => {
    service['documentClickListener']?.();
    service['keydownListener']?.();
    service.closeAll();
    vi.useRealTimers();
  });

  describe('open', () => {
    it('should create a backdropped overlay for a modal dialog', () => {
      const overlayCreateSpy = vi.spyOn(service['overlay'], 'create');

      service.open<TestDialogComponent, string>(testDialogConfig);

      expect(overlayCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hasBackdrop: true,
          backdropClass: 'lcc-modal-backdrop',
        }),
      );
    });

    it('should create an overlay without a backdrop for a non-modal dialog', () => {
      const overlayCreateSpy = vi.spyOn(service['overlay'], 'create');

      service.open<TestDialogComponent, string>({ ...testDialogConfig, isModal: false });

      expect(overlayCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ hasBackdrop: false }),
      );
    });

    it('should raise the overlay container above the rest of the page', () => {
      const overlayContainer = document.createElement('div');
      overlayContainer.classList.add('cdk-overlay-container');
      document.body.appendChild(overlayContainer);

      service.open<TestDialogComponent, string>(testDialogConfig);

      expect(overlayContainer.style.zIndex).toBe('1100');

      overlayContainer.remove();
    });

    it('should resolve with close instead of stacking a same-type dialog', async () => {
      service.open<TestDialogComponent, string>(testDialogConfig);

      const result = await service.open<TestDialogComponent, string>(testDialogConfig);

      expect(result).toBe('close');
      expect(service['dialogComponentRefs'].length).toBe(1);
    });

    it('should stack dialogs of different types with the newest on top', () => {
      service.open<TestDialogComponent, string>(testDialogConfig);
      const firstDialogRef = service.topDialogRef;

      service.open<AnotherDialogComponent, number>(anotherDialogConfig);

      expect(service['dialogComponentRefs'].length).toBe(2);
      expect(service.topDialogRef).not.toBe(firstDialogRef);
      expect(service.topDialogRef?.instance.dialogConfig).toBe(anotherDialogConfig);
    });

    it('should resolve with the emitted result and dispose the overlay', async () => {
      const dialogPromise = service.open<TestDialogComponent, string>(testDialogConfig);
      const disposeSpy = vi.spyOn(service['overlayRefs'][0], 'dispose');

      service.topDialogRef?.instance.result.emit('test-result');
      const result = await dialogPromise;

      expect(result).toBe('test-result');
      expect(disposeSpy).toHaveBeenCalled();
      expect(service['dialogComponentRefs'].length).toBe(0);
      expect(service['overlayRefs'].length).toBe(0);
      expect(service.topDialogRef).toBeNull();
    });

    it('should only dispose the top dialog when several are open', async () => {
      service.open<TestDialogComponent, string>(testDialogConfig);
      const topDialogPromise = service.open<AnotherDialogComponent, number>(
        anotherDialogConfig,
      );

      service.topDialogRef?.instance.result.emit(3);
      await topDialogPromise;

      expect(service['dialogComponentRefs'].length).toBe(1);
      expect(service['overlayRefs'].length).toBe(1);
    });
  });

  describe('document listeners', () => {
    it('should only register listeners once, after the opening click has passed', () => {
      const listenSpy = vi.spyOn(service['renderer'], 'listen');

      service.open<TestDialogComponent, string>(testDialogConfig);
      service.open<AnotherDialogComponent, number>(anotherDialogConfig);

      expect(listenSpy).not.toHaveBeenCalledWith(
        'document',
        expect.anything(),
        expect.anything(),
      );

      vi.runAllTimers();

      expect(
        listenSpy.mock.calls.filter(([target]) => target === 'document'),
      ).toHaveLength(2);
    });

    it('should close the top dialog on Escape', async () => {
      const dialogPromise = service.open<TestDialogComponent, string>(testDialogConfig);
      vi.runAllTimers();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      await expect(dialogPromise).resolves.toBe('close');
    });

    it('should ignore other keys', () => {
      service.open<TestDialogComponent, string>(testDialogConfig);
      vi.runAllTimers();
      const emitSpy = vi.spyOn(service.topDialogRef!.instance.result, 'emit');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should close the top dialog when its backdrop is clicked', async () => {
      const dialogPromise = service.open<TestDialogComponent, string>(testDialogConfig);
      vi.runAllTimers();
      const backdrop = document.createElement('div');
      backdrop.classList.add('cdk-overlay-backdrop');
      document.body.appendChild(backdrop);

      backdrop.click();

      await expect(dialogPromise).resolves.toBe('close');
      backdrop.remove();
    });

    it('should ignore clicks outside of a backdrop', () => {
      service.open<TestDialogComponent, string>(testDialogConfig);
      vi.runAllTimers();
      const emitSpy = vi.spyOn(service.topDialogRef!.instance.result, 'emit');

      document.body.click();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should remove listeners only once the last dialog closes', async () => {
      const unlistenSpies: Mock<void>[] = [];
      const renderer = service['renderer'];
      const originalListen = renderer.listen.bind(renderer);
      vi.spyOn(renderer, 'listen').mockImplementation((target, eventName, callback) => {
        const unlisten = originalListen(target, eventName, callback);
        if (target !== 'document') {
          return unlisten;
        }
        const unlistenSpy = vi.fn(unlisten);
        unlistenSpies.push(unlistenSpy);
        return unlistenSpy;
      });
      const firstPromise = service.open<TestDialogComponent, string>(testDialogConfig);
      const secondPromise = service.open<AnotherDialogComponent, number>(
        anotherDialogConfig,
      );
      vi.runAllTimers();

      service.topDialogRef?.instance.result.emit('close');
      await secondPromise;

      unlistenSpies.forEach(spy => expect(spy).not.toHaveBeenCalled());

      service.topDialogRef?.instance.result.emit('close');
      await firstPromise;

      expect(unlistenSpies).toHaveLength(2);
      unlistenSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    });
  });

  describe('closeAll', () => {
    it('should resolve every open dialog with close and dispose all overlays', async () => {
      const firstPromise = service.open<TestDialogComponent, string>(testDialogConfig);
      const secondPromise = service.open<AnotherDialogComponent, number>(
        anotherDialogConfig,
      );
      const disposeSpies = service['overlayRefs'].map(ref => vi.spyOn(ref, 'dispose'));

      service.closeAll();

      await expect(Promise.all([firstPromise, secondPromise])).resolves.toEqual([
        'close',
        'close',
      ]);
      disposeSpies.forEach(spy => expect(spy).toHaveBeenCalled());
      expect(service.topDialogRef).toBeNull();
    });

    it('should allow a dialog of a previously open type to be opened again', () => {
      service.open<TestDialogComponent, string>(testDialogConfig);

      service.closeAll();
      service.open<TestDialogComponent, string>(testDialogConfig);

      expect(service['dialogComponentRefs'].length).toBe(1);
      expect(service['overlayRefs'].length).toBe(1);
    });
  });
});
